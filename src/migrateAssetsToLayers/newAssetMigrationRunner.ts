import { Config } from "../config/config";
import { ElasticsearchDatastore } from "../repository/elasticsearch-datastore";
import { LayersCreatorFromAsset } from "./layersCreatorFromAsset";
import { BunchAsset } from "gvdl-repos-wrapper";
var debug = require('debug')('migration-runner');

/**
 * this migrator migrates from a current asset index to a new one, with a different mapping
 */
export class NewAssetMigrationRunner {

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

  async migrate() {
    try {

      const assetsFailedToIndex: string[] = [];
      let badCaptureOnAssets = 0;

/*
      const start = Date.now();
      const assets: BunchAsset[] = await this.assetsDatastore.getScroll();
      debug('millis elapsed: ', Date.now() - start);
*/

      const assets: BunchAsset[] = await this.readProblematicAssets();

      debug('assets.length: ' + assets.length);

      let counter = 0;
      for (const asset of assets) {
        if (++counter % 100 == 0)
          debug(`**** ${counter} out of ${assets.length}`);

        try {
          await this.assetsDatastore.indexItem(asset.assetId, asset, 'assets-08022021_1000');
          debug(`stored asset ${asset.assetId} `);
        } catch (error) {
          debug(`ERROR: Failed storing asset. `, error);
          if (error.message.includes('metadata.captureOn')) {
            debug('$$$  deleting asset with bad captureOn');
            //await assetsDatastore.deleteAsset(asset.assetId);
            ++badCaptureOnAssets;
          } else {
            debug(asset.assetId);
            assetsFailedToIndex.push(asset.assetId);
          }
        }

      }

      debug(`*** assets With Layers Failed To Index: ${assetsFailedToIndex.length} assets. ${assetsFailedToIndex}`);
      debug(`*** badCaptureOnAssets: ${badCaptureOnAssets}.`);
      debug(`layersMarkedDeleted: ${LayersCreatorFromAsset.instance.layersMarkedDeleted}`);
      debug(`pole-assets: ${LayersCreatorFromAsset.instance.poleAssets}`);
    } catch (e) {
      debug('failed execution:', e)
    }
  }

  async analyzeSpecificAsset(assetId: string) {
    try {

      const asset: BunchAsset = await this.assetsDatastore.getItem(assetId);

      try {
        await this.assetsDatastore.indexItem(asset.assetId, asset, 'assets-08022021_1000');
        debug(`stored asset ${asset.assetId} `);
      } catch (error) {
        debug(`ERROR: Failed storing layers. `, error);
      }
    } catch (e) {
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

  /**
   *
   * @param item: Layer or BunchAsset. is has 'metadata'.
   */
  static fixCaptureOn(item: any) {
    debug('1, ' + item.metadata.captureOn);
    if(!item.metadata.captureOn || item.metadata.captureOn === '') {
      delete item.metadata.captureOn;
      return;
    }

    const date = new Date(item.metadata.captureOn);
    debug('2, ' + date);
    item.metadata.captureOn = //date.toLocaleDateString();
        date.toLocaleDateString('en-US', {year: 'numeric', month: '2-digit', day: '2-digit'}); // 08/19/2020 (month and day with two digits)
    debug('3, ' + item.metadata.captureOn);
  }



  async fixAssetAndIndex(asset: BunchAsset) {
    NewAssetMigrationRunner.fixCaptureOn(asset);
    await this.assetsDatastore.indexItem(asset.assetId, asset);
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
const runner = new NewAssetMigrationRunner();
runner.migrate();
//runner.analyzeSpecificAsset('5v9wmc16vt8kdbh3f3tdrwgne6.ast');
