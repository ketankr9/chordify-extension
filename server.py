#!/bin/python3
from flask import Flask, request
import flask

import requests

import logging
logging.getLogger("werkzeug").disabled = True

app = Flask(__name__)

@app.route('/', methods = ['POST', 'GET'])
def mainFunc():
	if request.method == 'GET':
	    url = request.args.get('url')
	else:
		url = request.data

	req = requests.get(url)
	print(url)
	# print(req.status_code)
	text_data = req.text

	if req.status_code != 404:
		json_data = req.json()
		print(json_data["title"])
		print(json_data["url"])
	else:
		print(req.status_code)
		text_data = ""

	resp = flask.make_response(text_data)
	resp.headers["Access-Control-Allow-Origin"] = "*"

	return resp

# @app.route('/image', methods = ['POST', 'GET'])
# def image():
# 	x = requests.get(request.data)
# 	textt = x.text
#
# 	resp = flask.make_response(textt)
# 	resp.headers["Access-Control-Allow-Origin"] = "*"
#
# 	return resp

if __name__ == '__main__':
    app.run(debug=True, port=5000)
