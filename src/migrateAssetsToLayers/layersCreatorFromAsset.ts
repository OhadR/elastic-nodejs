import { BunchAsset, ImageLayer, Layer } from 'gvdl-repos-wrapper';
//import normalize from 'turf-normalize';
import * as normalize from 'turf-normalize';
import { ElasticsearchDatastore } from "../repository/elasticsearch-datastore";
var debug = require('debug')('elastic');


export class LayersCreatorFromAsset {

    private static _instance: LayersCreatorFromAsset;

    private constructor() {}

    public static get instance() {
        if( !LayersCreatorFromAsset._instance )
            LayersCreatorFromAsset._instance = new LayersCreatorFromAsset();

        return LayersCreatorFromAsset._instance;
    }

    public async processAsset(asset: BunchAsset, assetsDatastore: ElasticsearchDatastore): Promise<Layer[]> {
        let layersOfAsset: Layer[];
        try {
            //debug only: WARNING that will blast the logger:
            //debug(`pre: ${JSON.stringify(asset)}`);
            if (asset.rootUri && asset.metadata) {

                //patch:
                delete asset.metadata.uploadingJobs;

                //asset.metadata = JSON.parse(asset.metadata);
                if (Object.keys(asset.metadata).length === 0 || asset.type == 'utility-pole') {
                    return;
                }

                if (asset.metadata.dataTypes && Object.keys(asset.metadata.dataTypes).length > 0) {
                    layersOfAsset = await this.getLayersOfAsset(asset, asset.metadata.dataTypes, asset.rootUri);
                } else if (asset.metadata.dataTypesSources && Object.keys(asset.metadata.dataTypesSources).length > 0 && !asset.layerReadyTime) { // for backward compatibility
                    layersOfAsset = await this.getLayersOfAsset(asset, asset.metadata.dataTypesSources, asset.rootUri);
                } else if (asset.metadata.dataTypesSources && Object.keys(asset.metadata.dataTypesSources).length > 0 && asset.metadata.sourceFormat == 'rawImages') {
                    layersOfAsset = await this.getLayersOfAsset(asset, asset.metadata.dataTypesSources, asset.rootUri);
                }

                //if it is 'rawImages', get the layers for images:
                if (asset.metadata.sourceFormat == 'rawImages') {
                    const rawImagesLayer = await this.getLayerOfRawImages(asset);
                    if (rawImagesLayer != null) {
                        layersOfAsset = layersOfAsset.concat(rawImagesLayer);
                    }
                }
            }


        } catch (e) {
            debug(`Failed in assetId: ${asset.assetId} with the following error: `, e.stack);
        }

        if(!layersOfAsset) {
            debug('FUCKKKK', asset);
            await assetsDatastore.deleteAsset(asset.assetId);
            return;
        }

        // Normalize regions
        try {
            layersOfAsset = layersOfAsset.map(asset => ({
                ...asset,
                metadata: { ...asset.metadata, region: asset.metadata?.region ? normalize(asset.metadata.region) : undefined }
            }));
        } catch (ex) {
            debug({ message: 'Failed transforming', ex: ex.message });
        }
        return layersOfAsset;
    }


    private async getLayersOfAsset(asset: BunchAsset, productionList: any, rootUri: string): Promise<Layer[]> {
        let layers: Layer[] = [];
        //  const dynamoDatastore = new DynamoDatastore();// TODO: taken out after the fix script for populatedOnDatabase on ES

        for (var idx in productionList) {
            const layer = LayersCreatorFromAsset.createLayer(asset);
            layer.locatedOnDatabase = LayersCreatorFromAsset.shouldBeTakenFromDatabase(asset);
            if (Array.isArray(productionList)) //just to verify the move to mapping instead of array
            {

                layer.type = productionList[idx].toUpperCase();

                layer.id = asset.assetId + '-' + layer.type;
                layer.name = asset.name;

                layers.push(layer);
            } else {
                for (let url of productionList[idx]) {
                    let subdir = "";
                    if (["DSM", "POINT_CLOUD", "ORTHOMOSAIC", "3DMESH", "GeoJSON", "KML", "CZML", "SAP_Network_File"].indexOf(idx) >= 0) {
                        subdir = "mergeDataTile/";
                    }
                    layer.type = idx.toUpperCase();

                    layer.id = asset.assetId + '-' + layer.type;
                    layer.name = asset.name;

                    layers.push(layer);
                }
            }

        }
        return layers.filter(t => {
            return ["DSM", "POINT_CLOUD", "ORTHOMOSAIC", "3DMESH", "GEOJSON", "KML", "CZML", "WMTS", "SAP_NETWORK_FILE"].includes(t.type);
        });
    }

    private async getLayerOfRawImages(asset: BunchAsset): Promise<Layer> {

        return LayersCreatorFromAsset.createImageLayer(asset);
    }


    private static shouldBeTakenFromDatabase(asset: BunchAsset): boolean {
        if ("isMultiGeometriesTypes" in asset && asset.isMultiGeometriesTypes) {
            return false;
        }
        if ("populatedOnDatabase" in asset && asset.populatedOnDatabase) {
            return asset.populatedOnDatabase;
        }
        return false;
    }

    private static createLayer(asset: BunchAsset): Layer {
        const layer: Layer = {
            id: '',
            name: '', // default name is layer type
            metadata: asset.metadata,
            createdDate: asset.createdOn,
            createdBy: asset.createdBy,
            type: '',
            locatedOnDatabase: false,
            url: '',
            sourceId: asset.assetId,
        };
        layer.metadata.dataTypes ? delete layer.metadata.dataTypes : delete layer.metadata.dataTypesSources;

        return layer;
    }

    private static createImageLayer(asset: BunchAsset): ImageLayer {
        const imageLayer: ImageLayer = {
            type: 'rawImages',
            id: asset.assetId + '-rawImages',
            name: asset.name,
            metadata: asset.metadata,
            createdDate: asset.createdOn,
            createdBy: asset.createdBy,
            locatedOnDatabase: false,
            sourceId: asset.assetId,
            images: [],
        };
        imageLayer.metadata.dataTypes ? delete imageLayer.metadata.dataTypes : delete imageLayer.metadata.dataTypesSources;

        return imageLayer;
    }
}