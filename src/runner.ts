import { Config } from "./config/config";
import { ElasticsearchDatastore } from "./repository/utilities-elasticsearch-datastore";
var debug = require('debug')('http');

class GetLayersByBoundingBox {

  private searchAssetByField_pageLimit = 50;

  bucketToDomain = {};

  async handler()  {
    const accountId = '';
    try {
      debug('got accountId:', accountId);      //----------------------------------------------------------------------------------------------------------------------------------------

      const elasticConfig = Config.instance.elasticSearch;
      if (_.isError(elasticConfig)) {
        debug(`failed elasticConfig on ${accountId}`);

       // return this.error(500, elasticConfig);
      }

      const layersEsDatastore = new ElasticsearchDatastore(elasticConfig);
      debug(`GetLayersByBoundingBoxLambda.handler`);

      const hits: object[] = await layersEsDatastore.getLayersByOwner(accountId);
      debug(hits);

      //return this.response(200, layers);
    }
    catch(e) {
      debug('failed execution:', e.stack)
      //return this.error(500, {success: false, error: e.stack });
    }
  }


}