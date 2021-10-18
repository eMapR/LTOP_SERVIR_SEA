
import os
import pandas as pd
import numpy as np

df = pd.read_csv('/vol/v1/proj/LTOP_Oregon/tables/LTOP_Oregon_config_scores/LTOP_Oregon_config_scores.csv')
outfile = '/vol/v1/proj/LTOP_Oregon/tables/LTOP_Oregon_selected_configurations/LTOP_Oregon_config_selected.csv'

def ClusterPointCalc(dframe, clusterPoint_id):

    #print(clusterPoint_id)

    these = dframe[(dframe['cluster_id']==clusterPoint_id) & (dframe['selected']==101)]

    firstOfthese = these.head(1)[['cluster_id','index','params','spikeThreshold','maxSegments','recoveryThreshold','pvalThreshold']]

    #print(firstOfthese)

    return firstOfthese        

print(ClusterPointCalc(df,2540))

dfList = []

for i in list(range(5000)):

    i = i + 1

    if i == 1 :

        newDFpart = ClusterPointCalc(df,i)

    else:
    
        newDFpart2 = ClusterPointCalc(df,i)

        dfList.append(newDFpart2)


result = newDFpart.append(dfList)


result.to_csv(outfile, index=False)

