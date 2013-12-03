#!/usr/bin/python

from datetime import date, datetime
import json
import os
from os import walk
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
                    today = datetime.now().date()

                    # only incorporate forecast data if it's from today.
                    if from_date == today:
                        print 'FORECAST DATA will be used!'
                        forecast_data = json_data['forecast']['simpleforecast']['forecastday']
                        for daily_data in forecast_data:
                            monthly_data['data'].append({
                                'is_forecast': True,
                                'daynum': daily_data['date']['day'],
                                'precipi': daily_data['pop'],
                                'mintempi': float(daily_data['high']['fahrenheit']),
                                'maxtempi': float(daily_data['low']['fahrenheit'])
                            })


                # DAILY DATA
                else:
                    daily_data = json_data['history']['dailysummary'][0]

                    monthly_data['data'].append({
                        'daynum': int(daynum),
                        'precipi': float(daily_data['precipi']),
                        'mintempi': float(daily_data['mintempi']),
                        'maxtempi': float(daily_data['maxtempi'])
                    })

        file_path = os.path.join(dirpath, MONTHLY_SUMMARY_FILENAME)
        utils.write_json_data_to_file(monthly_data, file_path)
