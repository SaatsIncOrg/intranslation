var fs = require('fs'),
	path_library = require('path'),
	Promise = require('bluebird');

var app = {},
	path = '../',
	path_write = 'need_translation.json',
	path_translations = '',
	json_pretty = 'ugly',
	debug = false,
	data = [],
	data_translations = [],
	langs = [																	// languages to translate
		'eng',
		'fra',
		'jpn',
		'spa',
		'zho'
	];
	
// Read info sent from commandline
process.argv.forEach(function (val, index, array) {
	if (index > 1){
		var next = process.argv[index + 1];
		
		if ((typeof next !== 'undefined') && (next[0] != '-')){					// next item is present and doens't start with -	
			
			if (val.indexOf('-d') >= 0)
				path = ((next[next.length + 1] == '/') ? next : (next + '/'));													// set path to whatever comes next (add slash if needed)
			else if (val.indexOf('-f') >= 0)
				path_write = next;												// set path_write to whatever comes next
			else if (val.indexOf('-j') >= 0)
				json_pretty = next;													// set path_write to whatever comes next
			else if (val.indexOf('-t') >= 0)
				path_translations = next;											// existing translations
			else if (val.indexOf('-r') >= 0){										// sets both
				path_write = next;
				path_translations = next;											    
			}
		}
			
		if (val.indexOf('-v') >= 0)													// set debug flag
			debug = true;
	}
});

	
console.log('\nUsing path ' + path + ' and outputting to ' + path_write + ' in ' + json_pretty + ' JSON.');
console.log('\nUsing existing translations at ' + path_translations + '.');


// START


function get_files(this_path){
	return new Promise(function(resolve, reject){									// promisify
		
		var walk = function(dir, done) {
		  var results = [];
		  fs.readdir(dir, function(err, list) {
			if (err) return done(err);
			var pending = list.length;
			if (!pending) return done(null, results);
			list.forEach(function(file) {
			  file = path_library.resolve(dir, file);
			  fs.stat(file, function(err, stat) {
				if (stat && stat.isDirectory()) {
				  walk(file, function(err, res) {
					results = results.concat(res);
					if (!--pending) done(null, results);
				  });
				} else {
				  results.push(file);
				  if (!--pending) done(null, results);
				}
			  });
			});
		  });
		};
		
		walk(this_path, function(err, results) {
			if (err) 
				reject(err);
			else
				resolve(results);
		});
	});
}

readTranslations()																// get existing translations
	.then(function(content){
		if (app.is_json(content)){
			console.log('existing -- ', content);
			content = JSON.parse(content);												// parse JSON
			
			
			if (typeof content.data !== 'undefined')									// if nested
				data_translations = content.data != '';
			else																		// unnested
				data_translations = content;
				
			data_translations = ((data_translations != '') ? data_translations : [])
		}
		
		return get_files(path);		
	})
	.then(function(these_files){
		
		these_files = these_files.filter(function(file) { 
				log('Filtering file ' + file + '.');
				return ((file.substr(-4) === '.php') || (file.substr(-4) === '.hbs'));				// php or handlebars 
			});
			
			
		
		return readFiles(these_files);
	})
	.then(function(){																	// Done with all
		data = strip_empty(data);													    // strip files without translations
		console.log('\nFound ' + get_count(data) + ' translations in ' + data.length + ' files.');
		return app.add_translations();
	})
	.then(function(){
		return write_file(data);
	})
	.then(function(){
		console.log('File written to ' + path_write + '.');
	})
	.catch(function(err){
		console.log('Error at some point:', err);
	});
	
	
/*
function loop_dir(these_files){
	return new Promise(function(resolve, reject){
		var count = 0,
			total = these_files.length;
		
		function decide(){									// decide when to kill loop
			count++;
			if (count >= total)
				resolve();
		}
		
		these_files.forEach(function(this_file){
			read_dir(this_file)
				.then(function(){
					decide();
				})
				.catch(function(err){
					reject(err);
				});
		});
	})
}

function read_dir(this_path){
	return new Promise(function(resolve, reject){
		fs.readdir(path, function(err, files) {
			log('Starting read-directory ' + this_path + '.');
			
			files = files.filter(function(file) { 
				log('Filtering file ' + file + '.');
				return ((file.substr(-4) === '.php') || (file.substr(-4) === '.hbs'));				// php or handlebars 
			});
			
			readFiles(files)
				.then(function(data){
					log('Finished reading files from this directory.');
					resolve();
				})
				.catch(function(err){
					reject(err);
				});
		});
	});
}
*/
function log(message){																	// print out, if in 'verbose' mode
	if (debug)
		console.log('\n' + message);
}

function strip_empty(data){
	var rtn = [];
	
	data.forEach(function(file_val){													// loop files
		if (file_val && file_val.contents && (file_val.contents.length > 0))
			rtn.push(file_val);
	});
	
	return rtn;
}

function get_count(data){
	var total = 0;
	
	data.forEach(function(file_val){													// loop files

		total = total + file_val.contents.length;	
	});
	
	return total;
}


function readFiles(files){
	
	return new Promise(function(resolve, reject){
		
		if ((typeof files === 'undefined') || (files.length <= 0)){												// if no file, halt
			log('Found no files');
			resolve(data);
		}
		else {																			// if file exists
			log('Starting read of files');
			var	length = files.length,
				count = 0;
			
			files
			.forEach(function(file) { 
			
				log('Reading file ' + file + '.');

				readFile(file)
					.then(function(res){					// on success, add to array
						
						data.push(res);	
						
					})
					.catch(function(err){					// on failure, throw error
						
						console.log("There has been an error reading the file:", err);
						
					})
					.finally(function(){					// regardless, plus-up and check for end
						count++;
						log('Count ' + count + ' and length ' + length + '.');
						
						if (count == length){
							log('Reached the end of the file list.');
							resolve(data);
						}
							
					});

			});	
		}
		
		
    });
}

function translate(lang, haystack, page, word, tag){
	 haystack.forEach(function(page, page_index){                                                               // loop pages
		if (page.file == page){                                                                  // if correct page

			page.contents.forEach(function(val, index){
				if ((val.word == word) && ((typeof val.tag === 'undefined') || (val.tag == tag))){                  // if word matches, and tag matches or is empty
					return val.trans[lang];
				}
			});
		}
	});
	
	return false;
}

app.add_translations = function(){
	data.forEach(function(page, page_index){                                                               // loop pages
	
		page.contents.forEach(function(val, index){
			
			langs.forEach(function(lang){							// loop languages
				
				var trans_word = translate(lang, data_translations, page, val.word, val.tag);
				
				if (trans_word){								// if translation
					
					if (typeof data[page_index].contents[index].trans === 'undefined')
						data[page_index].contents[index].trans = {};
					
					data[page_index].contents[index].trans[lang] = trans_word;
					
				}	
			});
			
		});
	
	});
}

function readFile(this_file){
	
	return new Promise(function(resolve, reject){
        fs.readFile(this_file, 'utf-8', function(err, contents) { 
			if (!err){
				resolve({
					file: this_file.substring(this_file.lastIndexOf('\\') + 1),
					contents: inspectFile(contents)
				});
			}
			else
				reject(err);
			
		}); 
    });
}

function simpleReadFile(this_file){																	// just a promisified file-read
	
	return new Promise(function(resolve, reject){
        fs.readFile(this_file, 'utf-8', function(err, contents) { 
			if (!err)
				resolve(contents);
			else
				reject(err);
		}); 
    });
}

function readTranslations(this_file){																// if option for it, read existing-translations file
	
	if (path_translations == '')
		resolve('');
	else																							// if file path present
		return simpleReadFile(path_translations);

}

function inspectFile(contents) {
	var rtn = make_list(contents, /translate\('/gi, "'", true);											// translate('', '')
	
	rtn = rtn.concat(make_list(contents, /translate\("/gi, "\"", true));									// translate("", "")
	rtn = rtn.concat(make_list(contents, /\{\{trans '/gi, "'", false));									// {{trans '' ''}}
	rtn = rtn.concat(make_list(contents, /\{\{trans "/gi, "\"", false));									// {{trans "" ""}}
	
	return rtn;
}

function make_list(contents, regex, quote, is_php){														// is_php vs. handlebars template
		
	var trans_length = (is_php ? 11 : 9),
		result, 
		rtn = [],
		remain = '';								// left over, for pulling word
		
	while ( (result = regex.exec(contents)) ) {
		
		remain = contents.substring((result.index + trans_length));
		remain = remain.substring(0, (remain.indexOf((is_php ? ')' : '}}')) - 1));							// trim down to both strings without quotes on either end, eg.  hey','9092
		
		if (remain.indexOf(quote) >= 0)																		// If tag
			rtn.push({
				word: remain.substring(0, (remain.indexOf(quote))),
				tag: remain.substring((remain.lastIndexOf(quote) + 1), remain.length)						// cut off just before next quote
			});				
		else if (is_php)																			        // If NO tag and PHP (don't save no-tag handlebars)
			rtn.push({
				word: remain
			});
			
	}
	log(JSON.stringify(rtn, null, 4));
	return rtn;
	
}

function write_file(data){
		
	return new Promise(function(resolve, reject){
		fs.writeFile(path_write, JSON.stringify(data, null, ((json_pretty == 'pretty') ? 4 : null)), function (err) {
			if (err) 
				reject(err);
			else
				resolve();
		});
    });
}

app.is_json = function(string){
    // Below returns 'true' if json
    return (/^[\],:{}\s]*$/.test(string.replace(/\\["\\\/bfnrtu]/g, '@').
        replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
        replace(/(?:^|:|,)(?:\s*\[)+/g, ''))
    );
};