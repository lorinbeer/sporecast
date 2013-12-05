#!/usr/bin/python

from datetime import date
import json
import os
from os import walk
import math
import operator
import re
import sys

import utils


FILE_EXT = '.json'
MONTHLY_SUMMARY_FILENAME = 'data%s' % FILE_EXT

dir_to_start = sys.argv[1]

data_path = os.path.join(os.getcwd(), dir_to_start)
for (dirpath, dirnames, filenames) in walk(data_path):
    if len(filenames) > 0:
        monthly_data = {
            'data': []
        }
        for filename in filenames:
            if filename != MONTHLY_SUMMARY_FILENAME:
                print 'Reading %s in %s' % (filename, dirpath)
                f = open(os.path.join(dirpath, filename), 'r')
                json_data = json.loads(f.read())
                f.close()

                daynum = re.search('^([\d]+)', filename).groups()[0]

                # FORECAST DATA
                if filename.find('forecast10day') != -1:
                    (year, month) = re.search('(\d{4})\/(\d{2})$', dirpath).groups()

                    from_date = date(int(year), int(month), int(daynum))
                    today = utils.now_date()

                    # only incorporate forecast data if it's from today.
                    if from_date == today:
                        print 'FORECAST DATA will be used!'
                        forecast_data = json_data['forecast']['simpleforecast']['forecastday']
                        for daily_data in forecast_data:
                            daynum_in_data = daily_data['date']['day']
                            print 'DAYNUM IN DATA: %s' % daynum_in_data
                            if daynum_in_data > today.day:
                                monthly_data['data'].append({
                                    'is_forecast': True,
                                    'daynum': daynum_in_data,
                                    'precipi': daily_data['pop'],
                                    'precipi_is_zero': int(daily_data['pop']) == 0,
                                    'mintempi': float(daily_data['high']['fahrenheit']),
                                    'maxtempi': float(daily_data['low']['fahrenheit'])
                                })
                                #print 'Adding forecast for %s' % daynum

                # DAILY DATA
                else:
                    daily_data = json_data['history']['dailysummary'][0]

                    monthly_data['data'].append({
                        'daynum': int(daynum),
                        'precipi': float(daily_data['precipi']),
                        'precipi_is_zero': int(
                            math.ceil(float(daily_data['precipi']))) == 0,
                        'mintempi': float(daily_data['mintempi']),
                        'maxtempi': float(daily_data['maxtempi'])
                    })
                    #print 'Adding past for %s' % daynum

        monthly_data['data'].sort(key=operator.itemgetter('daynum'))
        file_path = os.path.join(dirpath, MONTHLY_SUMMARY_FILENAME)
        utils.write_json_data_to_file(monthly_data, file_path)
