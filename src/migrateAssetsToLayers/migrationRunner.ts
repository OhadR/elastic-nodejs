import { Config } from "../config/config";
import { ElasticsearchDatastore } from "../repository/elasticsearch-datastore";
import { LayersCreatorFromAsset } from "./layersCreatorFromAsset";
import { Layer, BunchAsset, LayersEsRepository } from "gvdl-repos-wrapper";
var debug = require('debug')('migration-runner');

class MigrationRunner {

  private assetsDatastore: ElasticsearchDatastore;

  constructor() {
    const elasticConfig = Config.instance.elasticSearch;
    if (elasticConfig == null) {
      debug(`failed getting elasticConfig `);
      throw new Error(`failed getting elasticConfig `);
    }

    this.assetsDatastore = new ElasticsearchDatastore(elasticConfig);
    debug(`got elastic set`);
  }

  async migrate()  {
    try {
      const assetsWithNoLayers: string[] = [];
      const assetsWithLayersFailedToIndex: string[] = [];
      let badCaptureOnAssets: string[] = [];


      const start = Date.now();
      const assets: BunchAsset[] = await this.assetsDatastore.getScroll();
      debug('millis elapsed: ', Date.now() - start);


      debug('assets.length: ' + assets.length);

      let counter = 0;
      for(const asset of assets) {
        if(++counter % 100 == 0)
          debug(`**** ${counter} out of ${assets.length}`);

        try {
          //break asset into layers and store them:
          const layers: Layer[] = await LayersCreatorFromAsset.instance.processAsset(asset);
          if(layers) {
            await Promise.all(layers.map(layer => LayersEsRepository.instance.indexItem(layer.id, layer)));
            debug(`stored ${layers.length} layers for asset ${asset.assetId} `);
          }
          else {
            assetsWithNoLayers.push(asset.assetId);
          }
        } catch(error) {
          debug(`ERROR: Failed storing layers. `, error);
          if(error.message.includes('metadata.captureOn')) {
            debug('$$$  deleting asset with bad captureOn');
            //await assetsDatastore.deleteItem(asset.assetId);
            badCaptureOnAssets.push(asset.assetId);
          }
          else {
            debug(asset.assetId);
            assetsWithLayersFailedToIndex.push(asset.assetId);
          }
        }

      }

      debug(`*** assetsWithNoLayers: ${assetsWithNoLayers.length} assets. ${assetsWithNoLayers}`);
      debug(`*** assets With Layers Failed To Index: ${assetsWithLayersFailedToIndex.length} assets. ${assetsWithLayersFailedToIndex}`);
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

      const asset: BunchAsset = await this.assetsDatastore.getItem(assetId);
      //debug(hits);

      try {
        //break asset into layers and store them:
        const layers: Layer[] = await LayersCreatorFromAsset.instance.processAsset(asset);
        if(layers) {
          await Promise.all(layers.map(layer => LayersEsRepository.instance.indexItem(layer.id, layer)));
          // debug(`analyzed ${layers.length} layers for asset ${asset.assetId} `);
          for(const layer of layers)
            debug(layer);
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
