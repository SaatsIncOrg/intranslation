var fs = require('fs'),
	Promise = require('bluebird');

var path = '../',
	path_write = 'need_translation.js',
	json_pretty = 'ugly',
	debug = false;
	
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
		}
			
		if (val.indexOf('-v') >= 0)												// set debug flag
			debug = true;
	}
});

	
console.log('\nUsing path ' + path + ' and outputting to ' + path_write + ' in ' + json_pretty + ' JSON.');


// START
fs.readdir(path, function(err, files) {
	log('Starting read-directory');
	
	files = files.filter(function(file) { 
		log('Filtering file ' + file + '.');
		return ((file.substr(-4) === '.php') || (file.substr(-4) === '.hbs'));				// php or handlebars 
	});
	
	readFiles(files)
		.then(function(data){
			log('Finished reading files');
			
			data = strip_empty(data);													   // strip files without translations
			
			console.log('\nFound ' + get_count(data) + ' translations in ' + data.length + ' files.');
			
			return write_file(data);
		})
		.then(function(){
			console.log("\nSuccessfully wrote the file");
		})
		.catch(function(err){
			console.log(err);
		});
});

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
		var data = [];
		
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
				var this_file = (path + file);
				log('Reading file ' + this_file + '.');

				readFile(this_file, file)
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

function readFile(this_file, short_name){
	
	return new Promise(function(resolve, reject){
        fs.readFile(this_file, 'utf-8', function(err, contents) { 
			if (!err){
				resolve({
					file: short_name,
					contents: inspectFile(contents)
				});
			}
			else
				reject(err);
			
		}); 
    });
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