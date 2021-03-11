import { ElasticsearchDatastore } from "../repository/elasticsearch-datastore";
import { LayersCreatorFromAsset } from "./layersCreatorFromAsset";
import { BunchAsset } from "gvdl-repos-wrapper";
import { fixCaptureOn, fixPolygon } from "./common-utils";
var debug = require('debug')('asset-migration-runner');

/**
 * this migrator migrates from a current asset index to a new one, with a different mapping
 */
class NewAssetMigrationRunner {

  private assetsDatastore: ElasticsearchDatastore;

  constructor() {
    this.assetsDatastore = new ElasticsearchDatastore();
    debug(`got elastic set`);
  }

  async migrate() {
    try {

      const assetsFailedToIndex: string[] = [];
      let badCaptureOnAssets: string[] = [];


/*
      const start = Date.now();
      const assets: BunchAsset[] = await this.assetsDatastore.getAllItems();
      debug('millis elapsed: ', Date.now() - start);
*/


      const assets: BunchAsset[] = await this.readProblematicAssets();

      debug('assets.length: ' + assets.length);

      let counter = 0;
      for (const asset of assets) {
        if (++counter % 100 == 0)
          debug(`**** ${counter} out of ${assets.length}`);

        try {
          await this.assetsDatastore.indexItem(asset.assetId, asset, 'assets-28022021');
          debug(`stored asset ${asset.assetId} `);
        } catch (error) {
          debug(`ERROR: Failed storing asset. `, error);
          if (error.message.includes('metadata.captureOn')) {
            debug('$$$  deleting asset with bad captureOn');
            //await assetsDatastore.deleteAsset(asset.assetId);
            badCaptureOnAssets.push(asset.assetId);
          } else {
            debug(asset.assetId);
            assetsFailedToIndex.push(asset.assetId);
          }
        }

      }

      debug(`*** assets With Layers Failed To Index: ${assetsFailedToIndex.length} assets. ${assetsFailedToIndex}`);
      debug(`*** badCaptureOnAssets: ${badCaptureOnAssets.length} assets. ${badCaptureOnAssets}.`);
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
        await this.fixAssetAndIndex(asset);
//        await this.assetsDatastore.indexItem(asset.assetId, asset, 'assets-28022021');
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

  async fixAssetAndIndex(asset: BunchAsset) {
    fixPolygon(asset);
    await this.assetsDatastore.indexItem(asset.assetId, asset);
  }

  private assetsIds = [
    '1wdw3pza7x9jdapgesvpa6g8ss.ast',
    '1e4evwp0qt94sa5bm0gyp6z43k.ast',
    '2vx6s8n9mq9py945p2k498mc19.ast',
    '5djdvd20n88kxbhx4b36bhybwt.ast',
    '5knx6awgk994mt55cc99pkka5j.ast',
    '7k848q0q4x9wd8j7r51vfk2ba4.ast',
    '7bkdtkx2v58hzvd8bna6sm32tr.ast'
  ]
}


debug('starting NewAssetMigrationRunner...');
const runner = new NewAssetMigrationRunner();
runner.migrate();
//runner.analyzeSpecificAsset('7bkdtkx2v58hzvd8bna6sm32tr.ast');
