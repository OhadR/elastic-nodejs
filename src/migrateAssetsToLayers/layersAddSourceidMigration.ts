import { LayersEsRepository, Layer } from "gvdl-repos-wrapper";
//import { LayersEsRepositoryEx } from "../repository/elasticsearch-layers-datastore";
var debug = require('debug')('LayersAddSourceidMigration');

/**
 * this migration reads all layers and add "sourceId" for each one. sourceId is actually the assetId.
 */
class LayersAddSourceidMigration {

  private layersDatastore: LayersEsRepository;

  constructor() {
    this.layersDatastore = new LayersEsRepository();
    debug(`got elastic set`);
  }

  async migrate()  {
    try {
      const layers: Layer[] = await this.layersDatastore.getAllItems();

//      const layers: Layer[] = await this.readProblematicLayers();

      debug('layers.length: ' + layers.length);

      let counter = 0;
      for(const layer of layers) {
        if(++counter % 100 == 0)
          debug(`**** ${counter} out of ${layers.length}`);

        try {
          const layerId = layer.id;
          if(!layerId) {
            debug('no layer id!', layer);
//            this.handleNoId(layer);
            continue;
          }
          //migrade only if needed (if missing sourceId):
          const sourceId = layer.sourceId;
          if(!sourceId) {
            debug('no source id!', layer.id);
            const [assetId] = layerId.split("-");

            const updateResult = await this.layersDatastore.updateItem(layerId, { sourceId: assetId });
            debug(updateResult);
          }



        } catch(error) {
          debug(`ERROR: Failed storing layers. `, error.message);
          debug(layer.id);
        }

      }
    }
    catch(e) {
      debug('failed execution:', e)
    }
  }



  async readProblematicLayers(): Promise<Layer[]> {
    const retVal: Layer[] = [];

    for(let i = 0; i < this.layersIds.length; ++i) {
      const layer: Layer = await this.layersDatastore.getItem(this.layersIds[i]);
      retVal.push(layer);
    }

    debug(`num assets read: ${retVal.length}`);
    return retVal;
  }

  private layersIds = [
    '75eqzvepx38x086kj0afrpxkqf.ast-rawImages',
    '75eqzvepx38x086kj0afrpxkqf.ast-rawImages',
  ]

  // private handleNoId(layer: any) {
  //   const updateResult = await this.layersDatastore.updateItem(layerId, { sourceId: layer.assetId });
  //
  // }
}


debug('starting runner...');
const runner = new LayersAddSourceidMigration();
runner.migrate();
