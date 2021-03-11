import { Layer, BunchAsset, LayersEsRepository } from "gvdl-repos-wrapper";

let debug = require('debug')('###');

class getItems {


    static async get() {
        const query = {
            "query": {
                "bool": {
                    "filter": [
                        {
                            "term": {
                                "metadata.sourceFormat": "GeoJSON"
                            }
                        }
                    ]
                }
            }
        };

        try {
            let response = await LayersEsRepository.instance.search(query);
            debug(response);
        } catch (error) {
            debug(error);
        }
    }
}

getItems.get();
