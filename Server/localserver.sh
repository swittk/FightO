#!/bin/bash
echo 'Server IP '`ifconfig en0 | grep inet | grep -v inet6`
python -m SimpleHTTPServer 8000