import { Config } from "../config/config";
import { ElasticsearchDatastore } from "../repository/elasticsearch-datastore";
import { LayersCreatorFromAsset } from "./layersCreatorFromAsset";
import { Layer, BunchAsset, LayersEsRepository } from "gvdl-repos-wrapper";
var debug = require('debug')('migration-runner');

class MigrationRunner {

  async migrate()  {
    try {
      const elasticConfig = Config.instance.elasticSearch;
      if (elasticConfig == null) {
        debug(`failed getting elasticConfig `);
        throw new Error(`failed getting elasticConfig `);
      }

      const assetsWithNoLayers: string[] = [];
      const assetsWithLayersFailedToIndex: string[] = [];

      const assetsDatastore = new ElasticsearchDatastore(elasticConfig);
      debug(`runner: got elastic' configuration`);

      const assets: BunchAsset[] = await assetsDatastore.getAssets();
      //debug(hits);
      debug('assets.length: ' + assets.length);

      for(const asset of assets) {
        try {
          //break asset into layers and store them:
          const layers: Layer[] = await LayersCreatorFromAsset.instance.processAsset(asset);
          if(layers) {
            await Promise.all(layers.map(layer => LayersEsRepository.instance.indexLayer(layer)));
            debug(`stored ${layers.length} layers for asset ${asset.assetId} `);
          }
          else {
            assetsWithNoLayers.push(asset.assetId);
          }
        } catch(error) {
          debug(`ERROR: Failed storing layers. `, error);
          debug(asset.assetId);
          assetsWithLayersFailedToIndex.push(asset.assetId);
        }

      }

      debug(`*** assetsWithNoLayers: ${assetsWithNoLayers.length} assets.`);
      debug(`*** assets With Layers Failed To Index: ${assetsWithLayersFailedToIndex.length} assets. ${assetsWithLayersFailedToIndex}`);


      /*
            const start = Date.now();
            const hitsScrolled: object[] = await assetsDatastore.getScroll();
            debug('hitsScrolled.length: ' + hitsScrolled.length);
            debug('millis elapsed: ', Date.now() - start);
      */


      //return this.response(200, layers);
    }
    catch(e) {
      debug('failed execution:', e.stack)
      //return this.error(500, {success: false, error: e.stack });
    }
  }

  async analyzeSpecificAsset(assetId: string)  {
    try {
      const elasticConfig = Config.instance.elasticSearch;
      if (elasticConfig == null) {
        debug(`failed getting elasticConfig `);
        throw new Error(`failed getting elasticConfig `);
      }

      const assetsDatastore = new ElasticsearchDatastore(elasticConfig);
      debug(`runner: got elastic' configuration`);

      const asset: BunchAsset = await assetsDatastore.getAsset(assetId);
      //debug(hits);

      try {
        //break asset into layers and store them:
        const layers: Layer[] = await LayersCreatorFromAsset.instance.processAsset(asset);
        if(layers) {
          debug(`analyzed ${layers.length} layers for asset ${asset.assetId} `);
        }
        else {
          debug('asset with no layers');
        }
      } catch(error) {
        debug(`ERROR: Failed storing layers. `, error);
      }
    }
    catch(e) {
      debug('failed execution:', e.stack)
    }
  }
}


debug('starting runner...');
const runner = new MigrationRunner();
runner.migrate();
//runner.analyzeSpecificAsset('1kzthk22n4951b4bqgv2qef02z.ast');
