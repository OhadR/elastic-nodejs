import {ElasticConfig} from "../types/config-type";
import {Client as ElasticClient} from "elasticsearch";
import * as _ from "lodash";
var debug = require('debug')('elastic');

const ASSETS_INDEX: string = 'assets';

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
        const aggregationName = 'uniq_components';
        let hits: object[];

        try {
            const response = await this._elasticClient.search({
                index: ASSETS_INDEX,
                body: {
                    query: {
                        term: { ownerId: ownerId }
                    }
                }
            });
            hits = response?.hits?.hits;
        } catch (error) {
            return Promise.reject();
        }

        debug(`UtilitiesElasticsearchDatastore.getAnnotationComponents: Successfully retrieved ${_.size(hits)} annotation's components for workorder id '${ownerId}'`);
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