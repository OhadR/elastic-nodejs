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


/*
      const start = Date.now();
      const assets: BunchAsset[] = await this.assetsDatastore.getScroll();
      debug('millis elapsed: ', Date.now() - start);
*/

      const assets: BunchAsset[] = await this.readProblematicAssets();

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

  async fixLayerAndIndex(layer: Layer) {
    let metadata: any = layer.metadata;
    debug('1, ' + metadata.captureOn);
    const date = new Date(metadata.captureOn);
    debug('2, ' + date);
    debug('3, ' + date.toLocaleDateString());
    metadata.captureOn = //date.toLocaleDateString();
        date.toLocaleDateString('en-US', {year: 'numeric', month: '2-digit', day: '2-digit'}); // 08/19/2020 (month and day with two digits)

    layer.metadata = metadata;
    await LayersEsRepository.instance.indexItem(layer.id, layer);
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
    '7zaepsp6jy91ya304zp43fezpa.ast',
    '6g0aqb608p9vfsnt0rhmndvrve.ast',
    '6m8xnajs0g86h9kqxtm2meqetw.ast',
    '1fwxvfg6qe9d1s1vt7tj1ar8w0.ast',
    '21xfzkb5dz9yx95qeb48p40jrv.ast',
    '57c6a40z84992tf6pqx39qat57.ast',
    '467hrsds88yc966vhqv6pq84j4.ast',
    '2a7pq7xwsc9vasacghs0jky1nt.ast'
  ]
}


debug('starting runner...');
const runner = new MigrationRunner();
runner.migrate();
//runner.analyzeSpecificAsset('1kzthk22n4951b4bqgv2qef02z.ast');
