import { Config } from "../config/config";
import { ElasticsearchDatastore } from "../repository/elasticsearch-datastore";
var debug = require('debug')('runner');

class MigrationRunner {

  async migrate()  {
    try {
      const elasticConfig = Config.instance.elasticSearch;
      if (elasticConfig == null) {
        debug(`failed getting elasticConfig `);
        throw new Error(`failed getting elasticConfig `);
      }

      const layersEsDatastore = new ElasticsearchDatastore(elasticConfig);
      debug(`runner: got elastic' configuration`);

      const hits: object[] = await layersEsDatastore.getAssets();
      //debug(hits);
      debug('hits.length: ' + hits.length);

      const hitsScrolled: object[] = await layersEsDatastore.getScroll();
      debug('hitsScrolled.length: ' + hitsScrolled.length);

      const ret: string = await layersEsDatastore.updateAsset('VMHS93QBTx0AMh3JVFjN', {
        id: 'VMHS93QBTx0AMh3JVFjN',
        ohad: 'redlich2',
      });
      debug(ret); //result should be 'updated'

      //return this.response(200, layers);
    }
    catch(e) {
      debug('failed execution:', e.stack)
      //return this.error(500, {success: false, error: e.stack });
    }
  }
}


debug('starting runner...');
const runner = new MigrationRunner();
runner.migrate();
