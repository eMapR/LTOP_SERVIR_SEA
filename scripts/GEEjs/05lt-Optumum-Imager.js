//######################################################################################################## 
//#                                                                                                    #\\
//#                             LANDTRENDR MULTI PARAMETER IMAGING                                     #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2020-12-10
// author: Peter Clary    | clarype@oregonstate.edu
//         Robert Kennedy | rkennedy@coas.oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

var aoi = ee.FeatureCollection("TIGER/2018/States").filterMetadata("NAME","equals","Oregon").geometry().buffer(5000);

var image = ee.Image("users/emaprlab/LTOP_Oregon_Kmeans_Cluster_Image")

var table = ee.FeatureCollection("users/emaprlab/LTOP_Oregon_config_selected");

//////////////////////////////////////////////////////////
//////////////////Import Modules ////////////////////////////
////////////////////////// /////////////////////////////

var ltgee = require('users/emaprlab/public:LT-data-download/LandTrendr_V2.5D.js'); 

//////////////////////////////////////////////////////////
////////////////////params//////////////////////////
////////////////////////// /////////////////////////////

var startYear = 1999; 
var endYear = 2020; 
var startDate = '06-20'; 
var endDate =   '09-10'; 
var maskThese = ['snow','cloud', 'shadow']
var fitIndex = 'NBR'

///////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////

Map.addLayer(image,{min:0, max:5000},'cluster')

///////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////

var lookUpList =  table.toList(5000)
//print(lookUpList)
var lowestOfTheTable = table.filterMetadata('cluster_id','less_than',3)
//print(lowestOfTheTable)
///////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////

// landsat surface reflactance image collection
var annualSRcollection = ltgee.buildSRcollection(startYear, endYear, startDate, endDate, aoi, maskThese);  

/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////

//transformed Landsat surface reflectance image collection
var annualLTcollectionNBR = ltgee.buildLTcollection(annualSRcollection, 'NBR', [fitIndex]); 
var annualLTcollectionNDVI = ltgee.buildLTcollection(annualSRcollection, 'NDVI', [fitIndex]);
var annualLTcollectionTCW = ltgee.buildLTcollection(annualSRcollection, 'TCW', [fitIndex]);
var annualLTcollectionTCG = ltgee.buildLTcollection(annualSRcollection, 'TCG', [fitIndex]);
var annualLTcollectionB5 = ltgee.buildLTcollection(annualSRcollection, 'B5', [fitIndex]);

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////// 
/////////////////////////////////////////////////////////

//map look up table. The look up table contains the selected LandTrendr parameter for each cluster
var printer = lookUpList.map(function(feat){
  
  //changes feature object to dictionary
  var dic = ee.Feature(feat).toDictionary()

  //calls number value from dictionary feature key, maxSegments.
  var maxSeg = dic.getNumber('maxSegments')

  //calls number value from dictionary feature key, spikeThreshold.
  var spikeThr = dic.getNumber('spikeThreshold')

  //calls number value from dictionary feature key, recoveryThreshold.
  var recov = dic.getNumber('recoveryThreshold') 

  // calls number value from dictionary feature key, pvalThreshold.
  var pval = dic.getNumber('pvalThreshold')
  
  // LandTrendr parameter dictionary template.
  var runParamstemp = { 
    timeSeries: ee.ImageCollection([]),
    maxSegments: maxSeg,
    spikeThreshold: spikeThr,
    vertexCountOvershoot: 3,
    preventOneYearRecovery: true,
    recoveryThreshold: recov,
    pvalThreshold: pval,
    bestModelProportion: 0.75,
    minObservationsNeeded: maxSeg
  };

  // get cluster ID from dictionary feature as a number
  var cluster_id = ee.Number(dic.get('cluster_id')).float()
  
  // creates a mask keep pixels for only a single cluster
  var masktesting = image.updateMask(image.eq(cluster_id)).not().add(1) 
  
  // blank
  var maskcol;
  
  // apply mask to transfrom landsat image collection if current feature index contains index type.
  if (dic.values(['index']).contains('B5')){
    maskcol = annualLTcollectionB5.map(function(img){
      var out = img.mask(ee.Image(masktesting)).set('system:time_start', img.get('system:time_start'));
      return out
    })
  // apply mask to transfrom landsat image collection if current feature index contains index type.
  } else if (dic.values(['index']).contains('NBR')){
    //maps over image collection appling the mask to each image
    maskcol = annualLTcollectionNBR.map(function(img){
      var out = img.mask(ee.Image(masktesting)).set('system:time_start', img.get('system:time_start'));
      return out
    })
  // apply mask to transfrom landsat image collection if current feature index contains index type.  
  }else if (dic.values(['index']).contains('NDVI')){
    //maps over image collection appling the mask to each image
    maskcol = annualLTcollectionNDVI.map(function(img){
      var out = img.mask(ee.Image(masktesting)).set('system:time_start', img.get('system:time_start'));
      return out
    })
  // apply mask to transfrom landsat image collection if current feature index contains index type.  
  }else if (dic.values(['index']).contains('TCW')){
    //maps over image collection appling the mask to each image
    maskcol = annualLTcollectionTCW.map(function(img){
      var out = img.mask(ee.Image(masktesting)).set('system:time_start', img.get('system:time_start'));
      return out
    })
  // apply mask to transfrom landsat image collection if current feature index contains index type.
  }else if (dic.values(['index']).contains('TCG')){
    //maps over image collection appling the mask to each image
    maskcol = annualLTcollectionTCG.map(function(img){
      var out = img.mask(ee.Image(masktesting)).set('system:time_start', img.get('system:time_start'));
      return out
    })
  }else{print('something wired')}
  
  // apply masked image collection to LandTrendr parameter dictionary
  runParamstemp.timeSeries = maskcol;
  
  //Runs LandTrendr
  var lt = ee.Algorithms.TemporalSegmentation.LandTrendr(runParamstemp).clip(aoi)//.select(0)//.unmask();
  
  // return LandTrendr image collection run to list.
  return lt

})

//print(printer)

//Mosaic each LandTrendr run in list to single image collection
var ltcol = ee.ImageCollection(printer).mosaic()

// get fitted data from LandTrendr
var fittied = ltgee.getFittedData(ltcol, startYear, endYear, fitIndex, [fitIndex],"fit_")

var runParams = { 
  maxSegments: 11,
};

var vertInfo = ltgee.getLTvertStack(ltcol, runParams);

var vertStack = vertInfo.select(['^.*yrs.*$'])

var ltStack = vertStack
  //.addBands(rmse)
  .addBands(fittied)
  //.addBands(nbrSource)
  .round()
  .toShort()
  .clip(aoi)
  //.unmask(-9999);
//Map.addLayer(ltStack)

//Map.addLayer(fittied,{},'getFittedData')

/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
Export.image.toAsset({
  image: ltStack,
  description: 'LTOP_Oregon_image_withVertYrs_'+fitIndex,
  assetId: 'LTOP_Oregon_image_withVertYrs_'+fitIndex,
  region: aoi,
  scale: 30,
  maxPixels: 10000000000000
})  
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
Export.image.toDrive({
        image:ltStack, 
        description: 'LTOP_Oregon_image_withVertYrs_'+fitIndex, 
        folder:'LTOP_Oregon_image_withVertYrs_'+fitIndex, 
        fileNamePrefix: "LTOP_Oregon_image_withVertYrs_"+fitIndex, 
        region:aoi, 
        scale:30, 
        crs:"EPSG:5070",
        maxPixels: 1e13 
      })  
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////



