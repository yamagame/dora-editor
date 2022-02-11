#!/bin/bash
cd `dirname $0`
rm ../dora-engine/public/scenario-editor/index.html
rm ../dora-engine/public/static/js/main-editor.*.js
rm ../dora-engine/public/static/css/main-editor.*.css
cp ./build/index.html ../dora-engine/public/scenario-editor/
cp ./build/static/js/main.*.js ../dora-engine/public/static/js/
cp ./build/static/css/main.*.css ../dora-engine/public/static/css/
