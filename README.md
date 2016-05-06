Welcome to InTranslation!

Don't get lost in translation, use this NPM module to grab all the translation in your PHP files and put it into a JS array!

Optional flags:
    -d : directory (where to look) - REQUIRED
    -f : file (file to output the JSON)
	-t : translations - current translations that will be pulled into new file
	-r : reconsile - fills both file/translations (to overwrite existing)
    -j : JSON format ('ugly' optional)
	-v : verbose (for debugging)

Run it like this:

    node node_modules/@saatsinc/intranslation/index.js -d content/public -r need_translation.js
