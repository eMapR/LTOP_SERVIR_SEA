

var aoi = ee.FeatureCollection("TIGER/2018/States").filterMetadata("NAME","equals","Oregon").geometry().buffer(5000);

var startYear = 1999;
var endYear = 2020;
var startDay = "06-20";
var endDay = "09-10";
var maskThese = ['water','snow','shadow'];
var exclude = {};
var index = "NBR" ;
var ftvList = ['NBR'];


var runParams = { 
  maxSegments: 8,
  spikeThreshold: 0.9,
  vertexCountOvershoot: 3,
  preventOneYearRecovery: true,
  recoveryThreshold: 0.75,
  pvalThreshold: 0.05,
  bestModelProportion: 0.50,
  minObservationsNeeded: 8
};



var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 

var annualSRcollection = ltgee.buildSRcollection(startYear, endYear, startDay, endDay, aoi, maskThese, exclude) ;

//print(annualSRcollection);
//Map.addLayer(annualSRcollection,{},'annualSRcollection');


var annualLTcollection = ltgee.buildLTcollection(annualSRcollection,index,ftvList);

//print(annualLTcollection);
//Map.addLayer(annualLTcollection,{},'annualLTcollection');

var transformCol = ltgee.transformSRcollection(annualSRcollection, ftvList);

//print(transformCol)
//Map.addLayer(transformCol,{},'transformCol')


var lt = ltgee.runLT(startYear, endYear, startDay, endDay, aoi, index, ftvList, runParams, maskThese, exclude)

var getFittedData = ltgee.getFittedData(lt, startYear, endYear, index, ftvList)
//Map.addLayer(getFittedData)


var years = [];                                                           // make an empty array to hold year band names
for (var i = startYear; i <= endYear; ++i) years.push("ftv_"+i.toString()); // fill the array with years from the startYear to the endYear and convert them to string



var outdata = getFittedData.select(getFittedData.bandNames(),years)
//Map.addLayer(outdata)

Export.image.toDrive({
  image:getFittedData,
  region:aoi, 
  scale:30,
  description:'LandTrendr_orig_oregon_nbr',
  folder:'LTOP_LandTrendr_Orig_Oregon_NBR',
  fileNamePrefix:'ltop_',
  crs:'EPSG:5070',
  maxPixels:1e13
});

var runInfo = ee.Dictionary({
  'featureCollection': "TIGER/2018/States", 
  'featureID': "Oregon",
  'gDriveFolder': "LTOP_LandTrendr_Orig_Oregon_NBR",
  'startYear': startYear,
  'endYear': endYear,
  'startDay': startDay,
  'endDay': endDay,
  'maskThese': maskThese,
  'runParams':runParams
});

var runInfo = ee.FeatureCollection(ee.Feature(null, runInfo));
Export.table.toDrive({
  collection: runInfo,
  description: 'LandTrendr_orig_oregon_nbr_Info',
  folder: "LTOP_LandTrendr_Orig_Oregon_NBR",
  fileNamePrefix: 'runInfo',
  fileFormat: 'GeoJSON'
});

Export.image.toAsset({
  image: outdata,
  description: 'LTOP_LandTrendr_ltOrig_Oregon_NBR',
  assetId: 'LTOP_LandTrendr_ltOrig_Oregon_NBR',
  region: aoi,
  scale: 30,
  maxPixels: 10000000000000
})  

