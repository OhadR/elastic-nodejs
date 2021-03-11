import * as _ from "lodash";
import { EsBaseRepository, BunchAsset } from "gvdl-repos-wrapper";
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


export class ElasticsearchDatastore extends EsBaseRepository<BunchAsset> {

    constructor() {
        super();
    }

    protected getIndex(): string {
        return ASSETS_INDEX;
    }

    public async getAssets(): Promise<BunchAsset[]> {
        debug(`getAssets: Retrieving assets`);
        let hits;


        try {
            const response = await this._elasticClient.search({
                index: ASSETS_INDEX,
                size: 5000,
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
}