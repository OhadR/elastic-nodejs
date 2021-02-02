import {ElasticConfig} from "../types/config-type";
import {Client as ElasticClient} from "elasticsearch";
import * as _ from "lodash";
import { BunchAsset } from "gvdl-repos-wrapper";
var debug = require('debug')('elastic');

const ASSETS_INDEX: string = 'assets';

const matchAllQuery = {
    query: {
        match_all: {}
    }
};

const geo_query = {
    query: {
        geo_shape: {
            "metadata.polygon": {
                relation: "intersects",
                shape: {
                    type:  "polygon",
                    coordinates: [[[10.526270711323841,10.444489244321758],
                        [11.925063668547947,10.371171909552444],
                        [11.070002142972083,9.364612094349482],
                        [10.526270711323841,10.444489244321758]]]
                }
            }
        }
    }
};

const simple_query = {
    query: {
        term: { 'metadata.p1': 'ownerId' }
    }
};

const boolQuery = {
    query: {
        bool: {
            filter: [
                {                term: { 'metadata.p1': 'MTohad' }            },
                {                term: { 'metadata.p2': 'MTredlich' }         }
            ],
        }
    }
};

const boolGeoQuery = {
    query: {
        bool: {
            filter: [
                {    term: { 'p2': 'redlich' }     },
                {    geo_shape: {
                        "metadata.polygon": {
                            relation: "intersects",
                            shape: {
                                type:  "polygon",
                                coordinates: [[[10.526270711323841,10.444489244321758],
                                    [11.925063668547947,10.371171909552444],
                                    [11.070002142972083,9.364612094349482],
                                    [10.526270711323841,10.444489244321758]]]
                            }
                        }
                    }
                }
            ],
        }
    }
};


export class ElasticsearchDatastore {

    protected _elasticClient: ElasticClient;

    constructor(elasticConfig: ElasticConfig) {
        const {url} = elasticConfig;

        this._elasticClient = new ElasticClient({
            host: url,
//            log: 'trace',
            log: 'info',
            apiVersion: '7.1' // use the same version of your Elasticsearch instance
        });

    }

    public async getAssets(): Promise<BunchAsset[]> {
        debug(`getAssets: Retrieving assets`);
        let hits;


        try {
            const response = await this._elasticClient.search({
                index: ASSETS_INDEX,
                size: 9000,
//                body: boolGeoQuery
                body: matchAllQuery
            });
            hits = response?.hits?.hits;
        } catch (error) {
            debug(error);
            return Promise.reject();
        }

        debug(`Successfully retrieved ${_.size(hits)} hits`);

        const assets = hits.map(hit => hit._source);

        return Promise.resolve(assets);
    }

    public async getAsset(assetId: string): Promise<BunchAsset> {
        debug(`getAsset: Retrieving asset`);
        let asset;

        try {
            const response = await this._elasticClient.get({
                index: ASSETS_INDEX,
                id: assetId,
                ignore: 404
            });
            asset = response?._source;
        } catch (error) {
            debug(error);
            return Promise.reject();
        }

        return Promise.resolve(asset);
    }


    public async getAnnotationComponents(workorderId: string): Promise<object[]> {
        if (!workorderId) {
            return Promise.reject();
        }

        debug(`UtilitiesElasticsearchDatastore.getAnnotationComponents: Retrieving annotation's components for workorder id '${workorderId}'`);
        const aggregationName = 'uniq_components';
        let buckets: object[];
        try {
            const response = await this._elasticClient.search({
                index: ASSETS_INDEX,
                // q:'default_operator=AND&q=accountId:${context.args.accountId}+workorderId:${context.args.workorderId}',
                q:`workorderId:${workorderId}`,
                body: {
                    size: 0,
                    aggs : {
                        [aggregationName] : {
                            terms : { field : "componentName" }
                        }
                    }
                }
            });
            buckets = response?.aggregations?.[aggregationName]?.buckets;
        } catch (error) {
            return Promise.reject();
        }

        const components = _.map(buckets, bucket => bucket.key);
        debug(`UtilitiesElasticsearchDatastore.getAnnotationComponents: Successfully retrieved ${_.size(components)} annotation's components for workorder id '${workorderId}'`);
        return Promise.resolve(components);
    }

    public async getScroll(): Promise<object[]> {
        const allQuotes = [];

        // start things off by searching, setting a scroll timeout, and pushing
        // our first response into the queue to be processed
        let response = await this._elasticClient.search({
            index: 'assets',
            // keep the search results "scrollable" for 30 seconds
            scroll: '30s',
            // for the sake of this example, we will get only one result per search
            size: 50,
            // filter the source to only include the quote field
//            _source: ['quote'],
            body: {
                query: {
                    match_all: {}
                }
            }
        });


        while (true) {

            debug('$$$$$$$$$$$$$$ ' + response.hits.hits.length);
            if(response.hits.hits.length == 0) {
                break;
            }

            // collect the titles from this response
            response.hits.hits.forEach(function (hit) {
                //debug(hit._id);
                allQuotes.push(hit._source)
            });

            // check to see if we have collected all of the quotes
            // if (body.hits.total.value === allQuotes.length) {
            //     console.log('Every quote', allQuotes);
            //     break
            // }

            // get the next response if there are more quotes to fetch
            response = await this._elasticClient.scroll({
                scrollId: response._scroll_id,
                scroll: '30s'
            });
        }

        return Promise.resolve(allQuotes);
    }

    public async updateAsset(id: string, body: object): Promise<string> {
        let response;
        debug(body);

        try {
            response = await this._elasticClient.update({
                index: ASSETS_INDEX,
                id: id,
                body: { doc: body }
            });
        } catch (error) {
            debug(error);
            return Promise.reject(error);
        }
        debug('response', response);
        return Promise.resolve(response.result);    //result should be 'updated'
    }

    public async deleteAsset(assetId: string): Promise<string> {
        let response;
        debug('deleting asset: ', assetId);

        try {
            response = await this._elasticClient.delete({
                index: ASSETS_INDEX,
                id: assetId
            });
        } catch (error) {
            debug(error);
            return Promise.reject(error);
        }
        debug('response', response);
        return Promise.resolve(response.result);    //result should be 'updated'
    }

}