import {ElasticConfig} from "../types/config-type";
import {Client as ElasticClient} from "elasticsearch";
import * as _ from "lodash";
var debug = require('debug')('http');

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

    public async getLayersByOwner(ownerId: string): Promise<Component[]> {
        if (!ownerId) {
            return Promise.reject();
        }

        debug(`UtilitiesElasticsearchDatastore.getLayersByOwner: Retrieving layers for ownerId '${ownerId}'`);
        const aggregationName = 'uniq_components';
        let buckets: {key: Component; doc_count: number;}[];

        try {
            const response = await this._elasticClient.search({
                index: ASSETS_INDEX,
                body: {
                    query: {
                        term: { ownerId: ownerId }
                    }
                }
            });
            buckets = response?.hits?.hits;
        } catch (error) {
            return Promise.reject();
        }

        const components = _.map(buckets, bucket => bucket.key);
        debug(`UtilitiesElasticsearchDatastore.getAnnotationComponents: Successfully retrieved ${_.size(components)} annotation's components for workorder id '${workorderId}'`);
        return Promise.resolve(buckets);
    }


    public async getAnnotationComponents(workorderId: string): Promise<Component[]> {
        if (!workorderId) {
            return Promise.reject(new UtilitiesInvalidArgsError({workorderId}));
        }

        debug(`UtilitiesElasticsearchDatastore.getAnnotationComponents: Retrieving annotation's components for workorder id '${workorderId}'`);
        const aggregationName = 'uniq_components';
        let buckets: {key: Component; doc_count: number;}[];
        try {
            const response = await this._elasticClient.search({
                index: ANNOTATIONS_INDEX,
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