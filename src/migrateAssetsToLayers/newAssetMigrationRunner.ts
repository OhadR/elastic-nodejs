import { Config } from "../config/config";
import { ElasticsearchDatastore } from "../repository/elasticsearch-datastore";
import { LayersCreatorFromAsset } from "./layersCreatorFromAsset";
import { BunchAsset } from "gvdl-repos-wrapper";
var debug = require('debug')('migration-runner');

/**
 * this migrator migrates from a current asset index to a new one, with a different mapping
 */
class NewAssetMigrationRunner {

  async migrate()  {
    try {
      const elasticConfig = Config.instance.elasticSearch;
      if (elasticConfig == null) {
        debug(`failed getting elasticConfig `);
        throw new Error(`failed getting elasticConfig `);
      }

      const assetsFailedToIndex: string[] = [];
      let badCaptureOnAssets = 0;

      const assetsDatastore = new ElasticsearchDatastore(elasticConfig);
      debug(`runner: got elastic' configuration`);


      const start = Date.now();
      const assets: BunchAsset[] = await assetsDatastore.getScroll();
      debug('millis elapsed: ', Date.now() - start);


      debug('assets.length: ' + assets.length);

      let counter = 0;
      for(const asset of assets) {
        if(++counter % 100 == 0)
          debug(`**** ${counter} out of ${assets.length}`);

        try {
          await assetsDatastore.indexItem('assets-08022021_1000', asset);
          debug(`stored asset ${asset.assetId} `);
        } catch(error) {
          debug(`ERROR: Failed storing asset. `, error);
          if(error.message.includes('metadata.captureOn')) {
            debug('$$$  deleting asset with bad captureOn');
            //await assetsDatastore.deleteAsset(asset.assetId);
            ++badCaptureOnAssets;
          }
          else {
            debug(asset.assetId);
            assetsFailedToIndex.push(asset.assetId);
          }
        }

      }

      debug(`*** assets With Layers Failed To Index: ${assetsFailedToIndex.length} assets. ${assetsFailedToIndex}`);
      debug(`*** badCaptureOnAssets: ${badCaptureOnAssets}.`);
      debug(`layersMarkedDeleted: ${LayersCreatorFromAsset.instance.layersMarkedDeleted}`);
      debug(`pole-assets: ${LayersCreatorFromAsset.instance.poleAssets}`);
    }
    catch(e) {
      debug('failed execution:', e)
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

      const asset: BunchAsset = await assetsDatastore.getItem(assetId);
      //debug(hits);

      try {
        // await Promise.all(layers.map(layer => LayersEsRepository.instance.indexLayer(asset)));
        // debug(`analyzed ${layers.length} layers for asset ${asset.assetId} `);
        debug(asset);
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
const runner = new NewAssetMigrationRunner();
runner.migrate();
//runner.analyzeSpecificAsset('1kzthk22n4951b4bqgv2qef02z.ast');
