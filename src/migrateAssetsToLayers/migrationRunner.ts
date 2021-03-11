import { Config } from "../config/config";
import { ElasticsearchDatastore } from "../repository/elasticsearch-datastore";
import { LayersCreatorFromAsset } from "./layersCreatorFromAsset";
import { Layer, BunchAsset, LayersEsRepository } from "gvdl-repos-wrapper";
import { convertPolygonToPoint, fixPolygon } from "./common-utils";
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


      const assets: BunchAsset[] = await this.assetsDatastore.getAllItems();


/*
      const assets: BunchAsset[] = await this.readProblematicAssets();
*/

      debug('assets.length: ' + assets.length);

      let counter = 0;
      for(const asset of assets) {
        if(++counter % 100 == 0)
          debug(`**** ${counter} out of ${assets.length}`);

        try {
          //break asset into layers and store them:
          const layers: Layer[] = await LayersCreatorFromAsset.instance.processAsset(asset);
          if(layers) {
            await Promise.all(layers.map(layer => this.fixLayerAndIndex(layer)));
            debug(`stored ${layers.length} layers for asset ${asset.assetId} `);
          }
          else {
            assetsWithNoLayers.push(asset.assetId);
          }
        } catch(error) {
          debug(`ERROR: Failed storing layers. `, error.message);
          if(error.message.includes('metadata.captureOn')) {
            debug('$$$  fixing asset with bad captureOn');
            //TODO fix
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

  async fixLayerAndIndex(layer: Layer) {
//    fixCaptureOn(layer);
//    convertPolygonToPoint(layer);
    await LayersEsRepository.instance.indexItem(layer.id, layer);
  }

  async analyzeSpecificAsset(assetId: string)  {
    try {

      const asset: BunchAsset = await this.assetsDatastore.getItem(assetId);

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

  async readProblematicAssets(): Promise<BunchAsset[]> {
    const retVal: BunchAsset[] = [];

    for(let i = 0; i < this.assetsIds.length; ++i) {
      const asset: BunchAsset = await this.assetsDatastore.getItem(this.assetsIds[i]);
      retVal.push(asset);
    }

    debug(`num assets read: ${retVal.length}`);
    return retVal;
  }

  private assetsIds = [
    '569p7jngk89h5t0ayb5q1xh079.ast',
    '7x7hqjzwk389bbq7cac16ngqx5.ast',
    '5b57hrm47r82yan8mgbbr513en.ast',
    '2pvkezfg0n86h80731xygs6zmt.ast',
    '167red05c48rg9k6k69pe0yp30.ast',
    '2h6c9vpwff9hztvgxwq21fv8wk.ast',
    '2kymqxysq39k6tmepk866tvj4y.ast',
    '1h87633c1f8kx98acg33k28j43.ast',
    '3ehpmdv1ng95qrt5p7fktkezap.ast',
    '879masm2j8sradmz9j02trcrt8.ast',
    '7d8d79xrye993b2ececkz248xw.ast',
    '2n0ssp3he0899b56955exf7f64.ast',
    '5yev7mvfcr87wv3kdgkq45nhba.ast',
    '5fjn5a319c9h7tvft0nc8qss7p.ast',
    '4pckx7kfeb9djbtj6jp1fktzap.ast',
    '481h3vxgq799pr0hdnb56eh8f0.ast'
  ]
}


debug('starting runner...');
const runner = new MigrationRunner();
runner.migrate();
//runner.analyzeSpecificAsset('qz1sadpsd9qj836r4wx693ddrq.ast');
