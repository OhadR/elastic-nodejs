import {ElasticConfig} from "../types/config-type";
import {Client as ElasticClient} from "elasticsearch";
import * as _ from "lodash";
var debug = require('debug')('elastic');

const ASSETS_INDEX: string = 'assets';

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
            log: 'trace',
            apiVersion: '7.1' // use the same version of your Elasticsearch instance
        });

    }

    public async getLayersByOwner(ownerId: string): Promise<object[]> {
        if (!ownerId) {
            return Promise.reject();
        }

        debug(`UtilitiesElasticsearchDatastore.getLayersByOwner: Retrieving layers for ownerId '${ownerId}'`);
        let hits: object[];


        try {
            const response = await this._elasticClient.search({
                index: ASSETS_INDEX,
                body: boolGeoQuery
            });
            hits = response?.hits?.hits;
        } catch (error) {
            debug(error);
            return Promise.reject();
        }

        debug(`Successfully retrieved ${_.size(hits)} hits for workorder id '${ownerId}'`);
        return Promise.resolve(hits);
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
}