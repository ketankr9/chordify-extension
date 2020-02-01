#!/bin/python3
from flask import Flask, request
import flask

import requests

app = Flask(__name__)

@app.route('/', methods = ['POST', 'GET'])
def mainFunc():
	if request.method == 'GET':
	    url = request.args.get('url')
	else:
		url = request.data

	req = requests.get(url)
	data = req.text

	resp = flask.make_response(data)
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
    app.run(debug=False)
