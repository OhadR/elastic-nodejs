import { Layer, LayersEsRepository } from "gvdl-repos-wrapper";
var debug = require('debug')('migration-runner');

/**
 * there was a bug in "delete layer', where instead of adding to the layer
 * { metadata: { deleted: true }},
 * there was:
 * { metadata.deleted: true },
 * so the layer was not really deleted and it was fetched by 'getLayersByFilter'.
 * this class DELETES all these wrongly-deleted layers.
 */
class DeleteDeltedLayers {

  private layersDatastore: LayersEsRepository = new LayersEsRepository();

  constructor() {}


  async run()  {
    try {
      const deletedLayers: string[] = [];

      const layers: Layer[] = await this.layersDatastore.getAllItems();

      debug('assets.length: ' + layers.length);

      let counter = 0;
      for(const layer of layers) {
        if(++counter % 100 == 0)
          debug(`**** ${counter} out of ${layers.length}`);

        if(Object.keys(layer).includes('metadata.deleted')) {
          deletedLayers.push(layer.id);
          debug(`** ${layer.id}`);
          //delete this layer (HARD-delete!)
          await this.layersDatastore.deleteItem(layer.id);
        }
      }

      debug(`*** deletedLayers: ${deletedLayers.length} layers. ${deletedLayers}`);
    }
    catch(e) {
      debug('failed execution:', e)
    }
  }
}


debug('starting runner...');
const runner = new DeleteDeltedLayers();
runner.run();
