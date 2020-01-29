from flask import Flask, request
import flask

import requests

app = Flask(__name__)


@app.route('/', methods = ['POST', 'GET'])
def mainFunc():
	data = request.data
	# print(data)

	x = requests.get(data)
	textt = x.text
	# print(textt)

	resp = flask.make_response(textt)
	resp.headers["Access-Control-Allow-Origin"] = "*"

	return resp

if __name__ == '__main__':
    app.run(debug=True)