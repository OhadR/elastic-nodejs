setting env-variables:

ELASTIC_SEARCH_URL=http://localhost:9200/

# for debug():
DEBUG=*,-not_this


get indices:

    GET
    http://localhost:9200/_cat/indices
    http://localhost:9200/_cat/indices/assets
    
get metadata of an index:

    GET
    http://localhost:9200/assets

get *mapping* of an index (how elastic treats each field):

    GET
    http://localhost:9200/assets/_mapping
    
mapping:

    PUT
    http://localhost:9200/assets/
    {
      "mappings": {
        "properties": {
          "metadata": {
           "properties": {
            "polygon":  { "type": "geo_shape" }
          }
         }
        }
      }
    }

OR: (and this one used for *editing existing mapping*):
 
    PUT
    http://localhost:9200/assets/_mapping
    {
        "properties": {
          "metadata": {
           "properties": {
            "polygon":  { "type": "geo_shape" }
          }
         }
        }
    } 
insert a doc:

    POST
    http://localhost:9200/assets/_doc
    {
            "p1":  "ohad",
            "p2":  "redlich",
            "p3":  "something"
    }
    
insert a doc - with Polygon (geo_shape):
    
    POST
    http://localhost:9200/assets/_doc
    {
            "polygon":  {
               "type": "Polygon",
               "coordinates": [
                 [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0],
                   [100.0, 1.0], [100.0, 0.0] ]
                 ]
             },
            "p3":  "something"
    }
    
get all docs:

    GET/POST
    http://localhost:9200/assets/_search

**search** for docs:

    POST
    http://localhost:9200/assets/_search
    {
      "query": {
        "term": {"p1": "ohad"   }
      }
    }