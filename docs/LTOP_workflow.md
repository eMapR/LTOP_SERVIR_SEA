### LTOP Overview

LandTrendr is a set of spectral-temporal segmentation algorithms that focuses on removing the natural spectral variations in a time series of Landsat Images. Stabling the natural variation in a time series, gives emphasis on how a landscape is evolving with time. This is useful in many pursuits as it gives information on the state of a landscape, be it growing, remaining stable, or on a decline. LandTrendr is mostly used in Google Earth Engine (GEE), an online image processing console, where it is readily available for use.  

A large obstacle in using LandTrendr in GEE, is knowing which configuration of LandTrendr parameters to use. The LandTrendr GEE function uses 9 arguments: 8 parameters that control how spectral-temporal segmentation is executed, and an annual image collection on which to assess and remove the natural variations. The original LandTrendr journal illustrates the effect and sensitivity of changing some of these values. The default parameters for the LandTrendr GEE algorithm do a satisfactory job in many circumstances, but extensive testing and time is needed to hone the parameter selection to get the best segmentation out of the LandTrendr algorithm for a given region. Thus, augmenting the LandTrendr parameter selection process would save time and standardize a method to choose parameters, but we also aim to take this augmentation a step further. 

Traditionally, LandTrendr is run over an image collection with a single LandTrendr parameter configuration and is able to remove natural variation for every pixel time series in an image. But no individual LandTrendr parameter configuration is best for all surface conditions, where forest may respond well to one configuration, but many under or over emphasize stabilization in another land class. Thus here we aim to delineate patches of spectrally similar pixels from the imagery, find what LandTrendr parameters work best for each patch group, and run LandTrendr on each patch group location with that best parameter configuration. 

### LTOP Work Flow (Step by Step) 

[GEE link](https://code.earthengine.google.com/https://code.earthengine.google.com/?accept_repo=users/emaprlab/SERVIR) open with Emapr Account for dependencies 

![img](https://lh4.googleusercontent.com/qpYv4_Q9InR0_LBzk1vdtIWhfLmMRNwZ840DSv6h0CzETzPjd2n6pgQP24eiHFQLfTKp3Tr17yLoqwdRfPeNb_YyktC60kTGnQulL7UwiLoQit-OyJJ3H_vI25-GE06J20ab_YeO=s0)

NOTE: The below work flow is of a Oregon test region. So file paths to data sets are symbolic. To Islay they are real from `vol/v1/proj`.  

#### 1 Run 01SNICPatches in GEE to generate SNIC images (GEE)

First, we want to break up an image into spectrally simular chucks, patches of pixels that are like one another. These could be pixels that make up a pond or a stand of forest. This is what the SNIC script does for us. One thing to note is that ever patch is independent of the other patches even if two patches represent the same land class. From this script we get a seed image, which represents the starting point of each patch. The Seed Image has several bands pretaining to mean spectral values of that Seed's patch.   

	0. Script location

		./LTOP_Oregon/scripts/GEEjs/01SNICPatches.js

	1. Copy and paste script in GEE console 
	
	2. Make sure you all needed dependencies (emapr GEE account has all dependencies) 

	3. Review in script parameters. Lines 35-39, lines 47-49 (SNIC years), lines 83,84 (SNIC)

	4. Run script (01SNICPatches)

	5. Run tasks

#### 2 Getting SNIC data from the Google drive to Islay (Moving Data)

Here, we move our SNIC datasets to a server for further processing .

	1. Open terminal on Islay in a VNC

	2. Activate conda environment “py35”

		conda activate py35

	3. This script bring data from the Google drive to Islay 

		./LTOP_Oregon/scripts/GEEjs/00_get_chunks_from_gdrive.py

	4. Run script 

		python ./LTOP_Oregon/scripts/GEEjs/00_get_chunks_from_gdrive.py LTOP_Oregon_SNIC_v1 ./LTOP_Oregon/rasters/01_SNIC/

	5. Check data at download destination. 

		./LTOP_Oregon/rasters/01_SNIC/

#### 3 Merge image chunks into two virtual raster (GDAL)

Out first processing step is to make a virual raster from the many Seed Image chuncks download. 

[add seed image]

	1. Activate conda environment

		a) conda activate gdal37

	2. Build VRT SNIC seed image 

		a) make text file of file path is folder (only tiffs in the folder)
	
			ls -d "$PWD"/* > listOfTiffs.txt

		b) build vrt raster with text file 

			gdalbuildvrt snic_seed.vrt -input_file_list listOfTiffs.txt

	3. Build VRT SNIC image 

		a) make text file of file path is folder (only tiffs in the folder)

			ls -d "$PWD"/* > listOfTiffs.txt

		b) build vrt raster with text file 

			gdalbuildvrt snic_image.vrt -input_file_list listOfTiffs.txt


	4. Inspect and process the merged imagery.

		a) Data location:

			./LTOP_Oregon/rasters/01_SNIC/snic_seed.vrt

			./LTOP_Oregon/rasters/01_SNIC/snic_image.vrt	(I don't think this is used in the work flow?)		


#### 4 Raster calc SNIC Seed Image to keep only seed pixels (QGIS)

Now we set a No Data to 0 making most of the image No Data which is usful in the next step 

[add no data seed image]

	1. Raster calculation (("seed_band">0)*"seed_band") / (("seed_band">0)*1 + ("seed_band"<=0)*0)

	2. Input:

		./LTOP_Oregon/rasters/01_SNIC/snic_seed.vrt

	3. Output: 	

		./LTOP_Oregon/rasters/01_SNIC/snic_seed_pixels.tif

	Note: 
		This raster calculation change the 0 pixel values to no data in Q-gis. However, this also 
		changes a seed id pixel to no data as well. But one out of hundreds of millions pixels is 
		inconsequential.



#### 5 Change the raster calc SNIC Seed Image into a vector of points. Each point corresponds to a seed pixel. (QGIS)

Here we change every pixel in the Seed Image to a point vector except pixels with no data values.

	1. Qgis tool - Raster pixels to points 
  	 

	2. Input

		./LTOP_Oregon/rasters/01_SNIC/snic_seed_pixels.tif

	3. Output

		./LTOP_Oregon/vectors/01_SNIC/01_snic_seed_pixel_points/01_snic_seed_pixel_points.shp


#### 6 Sample SNIC Seed Image with Seed points (QGIS) 

With point generated in the pervious step we extract the pixel values from the Seed Image across all bands and save them to a attribute table of the point vector file.

	0. Qgis tool - Sample Raster Values ~3362.35 secs) 

	1. Input point layer

		./LTOP_Oregon/vectors/01_SNIC/01_snic_seed_pixel_points/01_snic_seed_pixel_points.shp

	2. Raster layer 

		./LTOP_Oregon/rasters/01_SNIC/snic_seed.vrt

	3. Output column prefix

		seed_

	4. Output location 

		./LTOP_Oregon/vectors/01_SNIC/02_snic_seed_pixel_points_attributted/02_snic_seed_pixel_points_attributted.shp


#### 7 Randomly select a subset of 75k points (QGIS)

After sampling we select a subset of points. The size of the subset is arbitraray choosen to a size what works in GEE.

	0. Qgis tool - Random selection within subsets

	1. Input

		./LTOP_Oregon/vectors/01_SNIC/02_snic_seed_pixel_points_attributted/02_snic_seed_pixel_points_attributted.shp

	2. Number of selection 

		75000 

		Note: the value above is arbitrary

	3. Save selected features as:

 		./LTOP_Oregon/vectors/01_SNIC/03_snic_seed_pixel_points_attributted_random_subset_75k/03_snic_seed_pixel_points_attributted_random_subset_75k.shp


#### 8 Upload sample to GEE (Moving data)

Here we zip and upload the subset of vector points to GEE.

	1. file location 

		./LTOP_Oregon/vectors/01_SNIC/03_snic_seed_pixel_points_attributted_random_subset_75k/ 

	2. Zip shape files in directory

		zip -r 03_snic_seed_pixel_points_attributted_random_subset_75k.zip 03_snic_seed_pixel_points_attributted_random_subset_75k/ 

	3. Up load to GEE as asset

	4. GEE Asset location 

		users/emaprlab/03_snic_seed_pixel_points_attributted_random_subset_75k

#### 9 Kmeans cluster from SNIC patches (GEE) 

Remember in step 1 when I said the SNIC patch are independent of one another even if they represent the same land class. Well, it is here, where we link the patches that are simular to one another with the Kmeans alogroithm.  
	
	1. script local location

		./LTOP_Oregon/scripts/GEEjs/02kMeansCluster.js 

	2. copy and paste script into GEE console 
	
	2. Make sure you all needed dependencies 

	3. Review in script parameters.

		number of Kmean Clusters : 5000

	4. Run script

	5. Run tasks

		task to drive 

			Kmeans Cluster seed image to Google drive

				./LTOP_Oregon/rasters/02_Kmeans/LTOP_Oregon_Kmeans_seed_image.tif

		task to assets

			kmeans cluster image to GEE assets

				users/emaprlab/LTOP_Oregon_Kmeans_Cluster_Image


#### 10 Export KMeans seed image to Islay (Moving Data)

Download the Kmeans Seed image. This image looks like the SNIC Seed Image but the pixels values are Kmeans Cluster IDs. This IDs are the links between simular patches. 

	0. Open terminal on Islay in a VNC


	1. Script location 

		./LTOP_Oregon/scripts/GEEjs/

	2. Activate conda environment “py35”

		conda activate py35

	3. Python script syntax

		python 00_get_chunks_from_gdrive.py <google drive folder name> <local directory>

	4. Python Command

		python ./LTOP_Oregon/scripts/GEEjs/00_get_chunks_from_gdrive.py LTOP_Oregon_Kmeans_v1 ./LTOP_Oregon/rasters/02_Kmeans/gee/

	3. output location

		./LTOP_Oregon/rasters/02_Kmeans/gee/


#### 12 Sample Kmeans raster (QGIS)

Using the SNIC Seed point vector dataset, the output from step 5, we sample the Kmeans Seed Image.

	1. Qgis (TOOL: Sample Raster Values)

		a)Input 

			./LTOP_Oregon/rasters/02_Kmeans/LTOP_Oregon_Kmeans_seed_image.tif

			./LTOP_Oregon/vectors/01_SNIC/01_snic_seed_pixel_points/01_snic_seed_pixel_points.shp

		b) Output column prefix

			cluster_id

		c) output

			./LTOP_Oregon/vectors/02_Kmeans/LTOP_Oregon_Kmeans_Cluster_IDs.shp




#### 13 Get single point for each Kmeans cluster (Python)

Since our sample contains points for every pixel in the Seed Image there are duplicate Kmeans Cluster ID values. These duplicates represent Kmeans Clusters that are spectrally simular, linked land class if you will. But we only need vector point with a unique Cluster ID. So here we randomly select points each of which has a unique Kmeans Cluster ID. So we end up with 5000 points for 5000 Kmeans Cluster IDs.  

	1) location

		./LTOP_Oregon/scripts/kMeanClustering/randomDistinctSampleOfKmeansClusterIDs_v2.py

	2) Edit in script parameters  

		a) input shp file:

			./LTOP_Oregon/vectors/02_Kmeans/LTOP_Oregon_Kmeans_Cluster_IDs/LTOP_Oregon_Kmeans_Cluster_IDs.shp

		b) output shp file:

			./LTOP_Oregon/vectors/02_Kmeans/LTOP_Oregon_Kmeans_Cluster_ID_reps/LTOP_Oregon_Kmeans_Cluster_IDs.shp

	3) conda 

		conda activate geo_env

	4) run script

		python ./LTOP_Oregon/scripts/kMeanClustering/randomDistinctSampleOfKmeansClusterIDs_v2.py

#### 14 Upload SHP file of 5000 Kmeans cluster IDs points to GEE (Moving Data)

Move the random subset of the Kmeans sample points up to GEE.

	1) location 

		./LTOP_Oregon/vectors/02_Kmeans/LTOP_Oregon_Kmeans_Cluster_ID_reps/
	
	2) zip folder 

		zip -r LTOP_Oregon_Kmeans_Cluster_ID_reps.zip LTOP_Oregon_Kmeans_Cluster_ID_reps/

	3) upload to GEE 

		users/emaprlab/LTOP_Oregon_Kmeans_Cluster_ID_reps

#### 15 Sample Landsat Image Collections with the 5000 Kmeans Cluster Points (GEE)

With the subset sample of Kmeans Cluster points, a point for each cluster ID, sample a time series of Landsat Imagery (TCB TCG TCW NBR and NDVI). This sample is exported as a table from GEE.

[Image of Table]  


	1. script local location

		./LTOP_Oregon/scripts/GEEjs/03abstractSampler.js

	2. copy and paste script into GEE console 
	
	2. Make sure you all needed dependencies 

	3. Review in script parameters.

	4. Run script

	5. Run tasks

		task to drive 

			LTOP_Oregon_Abstract_Sample_annualSRcollection_Tranformed_NBRTCWTCGNDVIB5_v1.csv		


#### 16 Download CSV from Google Drive (Moving Data)

Download the table 

	1) Download from Google Drive

		LTOP_Oregon_Abstract_Sample_annualSRcollection_Tranformed_NBRTCWTCGNDVIB5_v1.csv

	2) location (islay)

		./LTOP_Oregon/tables/abstract_sample_gee/


#### 17 Create Abstract image with CSV (python) 

Here we create an abstract image. We start with the table that contains a time series of spretral values for 5000 points. These points locations are moved to be adjsent to one aonther, and are turned into pixels with each observation in the time series a new image of pixels. This script exports a TIFF image for every year in the time series and a new point vector file at each pixel locaton. 

[image of orignal points]
[image of move points]
[image of abstract image] 

	1) Script Location 

		./LTOP_Oregon/scripts/abstractImageSampling/csv_to_abstract_images.py

	2) Input

		./LTOP_Oregon/tables/abstract_sample_gee/LTOP_Oregon_Abstract_Sample_annualSRcollection_Tranformed_NBRTCWTCGNDVIB5_v1.csv

	3) Outputs

		a) image directory

			./LTOP_Oregon/rasters/03_AbstractImage/

		b) SHP directory

			./LTOP_Oregon/vectors/03_abstract_image_pixel_points/

	4) Conda 

		conda activate geo_env

	5) Run Command  

		python csv_to_abstract_images.py



#### 18 Upload rasters to GEE and make image collection (Moving Data)

We then upload the abstarct images to GEE

	1) Raster location

		./LTOP_Oregon/rasters/03_AbstractImage/

	2) make folder in GEE assets to hold all the images 

	3) Upload all images to assets folder 

	4) Make image collection in GEE assets tab

	5) add each abstract image to image collection


#### 19 Upload SHP to GEE (Moving Data)

Upload the shp file that acompanied the abstract image.

	1) SHP file location

		./LTOP_Oregon/vectors

	2) zip files

		zip -r 03_abstract_image_pixel_points.zip 03_abstract_image_pixel_points/

	3) Upload to GEE 


#### 20 Run Abstract image for each index (GEE)



	1. script local location

		./LTOP_Oregon/scripts/GEEjs/04abstractImager.js

	2. copy and paste script into GEE console 
	
	2. Make sure you all needed dependencies 

	3. Review in script parameters.

		a) check to make sure runParams pasted correctly (super long list)

		b) run script for each index 'NBR', 'NDVI', 'TCG', 'TCW', 'B5'

			i) editing line 18 to change index name

	4. Run script

	5. Run tasks

		task to drive (CSV) 

			LTOP_Oregon_abstractImageSamples_5000pts_v2/
							
							LTOP_Oregon_abstractImageSample_5000pts_lt_144params_B5_v2.csv
							LTOP_Oregon_abstractImageSample_5000pts_lt_144params_NBR_v2.csv
							LTOP_Oregon_abstractImageSample_5000pts_lt_144params_NDVI_v2.csv
							LTOP_Oregon_abstractImageSample_5000pts_lt_144params_TCG_v2.csv
							LTOP_Oregon_abstractImageSample_5000pts_lt_144params_TCW_v2.csv
 
#### 21 Download folder containing CSV‘s one for each index (Moving Data)

	1) script location 

		./LTOP_Oregon/scripts/GEEjs/00_get_chunks_from_gdrive.py

	2) Run Command 

		conda activate py35

		python 00_get_chunks_from_gdrive.py LTOP_Oregon_abstractImageSamples_5000pts_v2 ./LTOP_Oregon/tables/LTOP_Oregon_Abstract_Image_LT_data/

	3) output location 

		./LTOP_Oregon/tables/LTOP_Oregon_Abstract_Image_LT_data/


#### 22 Run LT Parameter Scoring scripts (Python)

	1) script locaton

		./LTOP_Oregon/scripts/lt_seletor/01_ltop_lt_parameter_scoring.py

	2) Edit line 119 as the input directory of csv files

		a) input directory 

			./LTOP_Oregon/tables/LTOP_Oregon_Abstract_Image_LT_data/


	3) Edit line 653 as the output csv file

		a) output line 563

			./LTOP_Oregon/tables/LTOP_Oregon_selected_config/LTOP_Oregon_selected_config.csv

	4) run script

		conda activate geo_env

		python ./LTOP_Oregon/scripts/lt_seletor/01_ltop_lt_parameter_scoring.py

#### 23 Run LTOP Parameter Selecting Script (Python)

	1) script location

		./LTOP_Oregon/scripts/lt_seletor/02_ltop_select_top_parameter_configuration.py

	2) Edit and review script

		input file path line 6

			./LTOP_Oregon/tables/LTOP_Oregon_config_scores/LTOP_Oregon_config_scores.csv

		output file path line 7

			./LTOP_Oregon/tables/LTOP_Oregon_selected_configurations/LTOP_Oregon_config_selected.csv

	3) run script

		conda base

		python ./LTOP_Oregon/scripts/lt_seletor/02_ltop_select_top_parameter_configuration.py

#### 24 Upload CSV to GEE (Moving Data)

	1) CSV location 

		./LTOP_Oregon/tables/LTOP_Oregon_selected_configurations/LTOP_Oregon_config_selected.csv

	2) Upload CSV as an asset to GEE	

	
#### 26 Generate LTOP image in GEE (GEE) !!!Oregon took 3 days time!!!

	1) script location

		./LTOP_Oregon/scripts/GEEjs/05lt-Optumum-Imager.js

	2) Edit and review script

	3) run script

	4) Run Task
	
		asset task

		to drive task

#### 27 Download LTOP imagery (Moving Data)

	0. Open terminal on Islay in a VNC


	1. Script location 

		./LTOP_Oregon/scripts/GEEjs/

	2. Activate conda environment “py35”

		conda activate py35

	3. Python script syntax

		python 00_get_chunks_from_gdrive.py <google drive folder name> <local directory>

	4. Run script 

		python 00_get_chunks_from_gdrive.py LTOP_Oregon_image_withVertYrs_NBR /LTOP_Oregon/rasters/04_LTOP_Image_NBR/
		
	5. Check data at download destination. 

		./LTOP_Oregon/rasters/01_SNIC/

