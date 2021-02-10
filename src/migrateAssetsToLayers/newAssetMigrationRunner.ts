import { Config } from "../config/config";
import { ElasticsearchDatastore } from "../repository/elasticsearch-datastore";
import { LayersCreatorFromAsset } from "./layersCreatorFromAsset";
import { BunchAsset } from "gvdl-repos-wrapper";
var debug = require('debug')('migration-runner');

/**
 * this migrator migrates from a current asset index to a new one, with a different mapping
 */
class NewAssetMigrationRunner {

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

  private assetsIds = [
    '5a69dejnyj8bsanjdvq5w2rwjf.ast',
    '382vqx17qr8108ppab61v227ng.ast',
    '3n6ajthqwb8kyscyqb4rh3zmxw.ast',
    '43spdgeqjw93j86dqb2je9t9xh.ast',
    '2b2p24ww259xxbxh5j646cd9at.ast',
    '3sd40ek0zg9qe80ev3naa2x0dv.ast',
    'fmd9r4an686zbf4064njk9nhtf.ast',
    '2gdhvgy1z393k9kz1nq98ygjxc.ast',
    '65bfv4xkc08jys8s63kk3z9mmg.ast',
    '3p791g3s3z8m5r86tr1sdmmj37.ast',
    '3w6n7q4z0e9szsg9m3cmht5mqm.ast',
    '58ax3acxtw8sqt15711439tpp5.ast'
  ]
}


debug('starting runner...');
const runner = new NewAssetMigrationRunner();
runner.migrate();
//runner.analyzeSpecificAsset('5v9wmc16vt8kdbh3f3tdrwgne6.ast');
