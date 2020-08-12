setting env-variables:

ELASTIC_SEARCH_URL=http://localhost:9200/

// for debug():
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
   
**GEO search** for docs: 
given a polygon, seach for all polygons in the ES that intersents.
  
    POST
    http://localhost:9200/assets/_search
    {
     "query": {
       "geo_shape": {
         "metadata.polygon": { 
           "relation": "intersects",
           "shape": {
             "type":  "polygon",
             "coordinates": [[[10.526270711323841,10.444489244321758],
                             [11.925063668547947,10.371171909552444],
                             [11.070002142972083,9.364612094349482],
                             [10.526270711323841,10.444489244321758] ]]
           }
         }
       }
     }
    } 
    
---
![geo-mapping](/images/Image_5.jpg)

![photo explaining dynamic mapping and geo-mapping](/images/Image_6.jpg)

explanation about HOW elastic indexes locations (quad-trees).

Source: https://medium.com/@yatinadd/going-geospatial-with-elasticsearch-using-geo-points-plus-its-application-b013c638064e

---
Source: https://www.compose.com/articles/geofile-elasticsearch-geo-queries-2/


"We can add more to this query by defining another field called `relation`, which allows us to add spatial relation operators: `intersects`, `disjoint`, `within`, or `contains`. 
A handy guide to these is located [here](https://www.elastic.co/guide/en/elasticsearch/reference/2.4/geo-shape.html#spatial-strategy). 
The default value is intersects which in our case will give us all the cities within and on the border of our county. If we use a relation like disjoint, all the cities outside of King County will be counted."