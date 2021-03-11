import { ElasticsearchDatastore } from "./repository/elasticsearch-datastore";
var debug = require('debug')('runner');

class GetLayersByBoundingBox {

  async run()  {
    const ownerId = 'MTohad';
    try {
      debug('got accountId:', ownerId);      //----------------------------------------------------------------------------------------------------------------------------------------

      const layersEsDatastore = new ElasticsearchDatastore();
      debug(`runner: got elastic' configuration`);

      const hits: object[] = await layersEsDatastore.getAssets();
      //debug(hits);
      debug('hits.length: ' + hits.length);

      const hitsScrolled: object[] = await layersEsDatastore.getAllItems();
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


  async updateMetadata()  {
    const ownerId = 'MTohad';
    try {
      const layersEsDatastore = new ElasticsearchDatastore();
      debug(`runner: got elastic' configuration`);

      const ret: string = await layersEsDatastore.updateAsset('4bjst5s49e8qc8gfwmem3qvaby.ast', {
        metadata: {
          dataTypes: ['ORTHOOHAD 2']
        }
      });

      debug(ret); //result should be 'updated'
    }
    catch(e) {
      debug('failed execution:', e.stack)
      //return this.error(500, {success: false, error: e.stack });
    }
  }


}

debug('starting runner...');
const runner = new GetLayersByBoundingBox();
//runner.run();
runner.updateMetadata();