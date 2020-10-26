
var fs = require('fs')
var path = require('path')

var functions = {}

var storePath = path.join(__dirname,'/../data/store.json')
var indexPath = path.join(__dirname,'/../data/posts_index.json')

var sortDocs = function(docs, sort_field, order) {
	console.log('sortDocs: field ',sort_field);

	docs.sort(function(a,b) {
		if (a[sort_field] < b[sort_field]) {
			if (order == 'asc') {
				return -1
			}
			return 1
		} else {
			if (order == 'asc') {
				return 1
			}
			return -1
		}
	});
	console.log("Sorted docs",docs);
}

var filterPosts = function(docs, query) {
	response_docs = []
	search_string = query.q

	console.log('filterPosts:docs, ',docs);
	for (doc of docs) {
		if (query.author) {
			if (doc.author) {
				if (!(doc.author == query.author)) {
					continue
				}
			}
		}
		if (query.title) {
			if (doc.title) {
				if (!(doc.title == query.title)) {
					continue
				}
			}
		}

		if (search_string) {
			var match = false
			if (doc.title) {
				if (doc.title.includes(search_string)) {
					console.log("Search succeeded query ",search_string)
					match = true
				}
			}
			if (doc.author) {
				if (doc.author.includes(search_string)) {
					console.log("Search succeeded query ",search_string)
					match = true
				}
			}
			console.log("match ", match);
			if (!match) {
				continue;
			}
		}

		// Increment the view count
		if (doc.views) {
			doc.views = doc.views + 1
		}
		console.log("pusing doc ",doc);
		response_docs.push(doc)
	}
	return response_docs
}

var filterAuthors = function(docs, query) {
	response_docs = []
	search_string = query.q
	for (doc of docs) {
		if (query.first_name) {
			if (doc.first_name) {
				if (!(doc.first_name == query.first_name)) {
					continue
				}
			}
		}
		if (query.last_name) {
			if (doc.last_name) {
				if (!(doc.last_name == query.last_name)) {
					continue
				}
			}
		}

		if (search_string) {
			var match = false
			console.log("doc ",doc);
			if (doc.first_name) {
				if (doc.first_name.includes(search_string)) {
					console.log("Search succeeded query ",search_string)
					match = true
				}
			}
			if (doc.last_name) {
				if (doc.last_name.includes(search_string)) {
					console.log("Search succeeded query ",search_string)
					match = true
				}
			}

			if (!match) {
				continue;
			}
		}
		response_docs.push(doc)
	}
	return response_docs;
}

var filterDocs = function(docs, query) {
	doc_type = get_doc_type(query.path)
	console.log('doc_type ', doc_type)

	if (doc_type == 'posts') {
		return filterPosts(docs, query);
	}
	if (doc_type == 'authors') {
		return filterAuthors(docs, query);
	}
	return []
}

var parsePath = function(uri_path) {
	var paths = uri_path.split("/")
	return paths
}

var get_doc_type = function(path) {
	return parsePath(path)[0]
}

var get_resource = function(store, resource_path) {
	paths = parsePath(resource_path);
	doc = store;

	for (path of paths) {
		if (doc[path]) {
			doc = doc[path];
		} else {
			return {}
		}
	}
	return doc;
}

var validate_payload = function(payload, doc_type) {
	return true
}

functions.get = function(payload, query, callback) {
	var paths = parsePath(query.path)

	var doc_type = paths[0]
	var doc_id = -1

	if (paths.length == 2) {
		doc_id = paths[1]
	}

	var res_json = {}
	fs.readFile(storePath, (err, data) => {
		const search_string = query.q
		console.log("GET reading file store.json")

		if (err) {
			console.log("unable to read file")
			callback(500, "Unable to read store")
			return
		} else {
			const store = JSON.parse(data);

			docsResource = store[doc_type];
			docs = docsResource.docs

			console.log("store ",store);
			console.log("doc_id ",doc_id);

			response_docs = [];

			if (doc_id != -1) {
				console.log("Type of doc_id ",typeof(doc_id));
				if (docs[doc_id]) {
					docs[doc_id].views = docs[doc_id].views + 1
					console.log("Document found for id ",doc_id);
					response_docs.push(docs[doc_id])
				}
			} else {
				//TODO(Arpit): Also Validate if query params are supported for the document type
				const is_filtering_enabled = (search_string || query.author || query.title || query.first_name || query.last_name)

				console.log("Query ", query);
				console.log("Filter ", is_filtering_enabled);
				if (is_filtering_enabled) {
					console.log("Filtering docs as per query parameters")
					docs_to_filter = Object.keys(docs).map(function(key) {
										return docs[key];
									});
					response_docs = filterDocs(docs_to_filter, query)
				} else {
					console.log('return all docs of type ',doc_type);
					for (doc_id in docs) {
						docs[doc_id].views = docs[doc_id].views + 1;
					}
					response_docs = Object.keys(docs).map(function(key) {
										return docs[key];
									});
				}
			}

			if (response_docs.length > 0) {
				if (query._sort) {
					const sort_field = query._sort;
					var order = "asc";
					if (query._order) {
						order = query._order;
					}
					console.log("Sort order ",order)

					if (query.path == 'authors') {
						if (!(sort_field == 'first_name' || sort_field == 'last_name' || sort_field == 'posts' || sort_field == 'id')) {
							res_json["error"] = "Invalid sort field";
							res_json["msg"] = "Failed";
							console.log("invalid sort field")
							callback(500, JSON.stringify(res_json));
							return
						}
					} else {
						if (!(sort_field == 'views' || sort_field == 'author' || sort_field == 'title' || sort_field == 'id')) {
							res_json["error"] = "Invalid sort field";
							res_json["msg"] = "Failed";
							callback(500, JSON.stringify(res_json))
							return
						}
					}

					sortDocs(response_docs, sort_field, order)
				}
				callback(200, JSON.stringify(response_docs))
				console.log("Incrementing the view count")
				fs.writeFile(storePath, JSON.stringify(store,null, 4), (err) => {
					if (err) {
						console.log("Unable to increment the view count");
					} else {
						console.log("successfully incremented the view counts");
					}
				});
				return;
			}
			console.log("id not found in store");
			callback(500, "{'error': 'Resource not found'}");
		}
	});
};

functions.put = function(payload, query, callback) {
	var paths = parsePath(query.path)

	var doc_type = paths[0]
	var doc_id = -1

	if (paths.length == 2) {
		doc_id = paths[1]
	} else {
		console.log("Bulk update of resources")
	}

	if (doc_id != -1) {
		fs.readFile(storePath, (err,data) => {
			console.log("PUT: reading file store.json");
			if (err) {
				console.log("unable to read file");
				const res_json = {"error": "Unable to read store file", "msg":"Failed"};
				callback(500, JSON.stringify(res_json));
			} else {
				const store = JSON.parse(data);
				const docsResource = store[doc_type];
				var docs = docsResource.docs

				var docExists = false;
				if (docsResource.index[doc_id]) {
					if (docsResource.index[doc_id] == 1) {
						docExists = true;
					}
				}

				if (!docExists) {
					console.log("Doc does not exits, use a POST request to first create the resource");
					const res_json = {"error": "Resource not found", "msg":"Use POST for creating a resource"};
					callback(500, JSON.stringify(res_json));
					return
				}

				//TODO(Arpit) : Validate that the payload is a valid payload for a particular doc type
				if (!(validate_payload(payload, doc_type))) {
					console.log("Invalid payload");
					const res_json = {"error": "Invalid payload"};
					callback(500, JSON.stringify(res_json));
					return
				}

				if (payload.id) {
					if (payload.id != doc_id) {
						console.log("The id cannot be mutated");
						const res_json = {"error": "Id mutation is prohibited"};
						callback(500, JSON.stringify(res_json));
						return
					}
				}
				payload.id = doc_id;
				docs[doc_id] = payload;

				fs.writeFile(storePath, JSON.stringify(store, null, 4), err=> {
					var res_json = {};
					if (err) {
						res_json["error"] = "I/O error"
						res_json["msg"] = "Failed due to i/o error"
						callback(500, JSON.stringify(res_json));
						return
					}
					res_json["error"] = null
					res_json["msg"] = "Success"
					callback(200, JSON.stringify(res_json));
				});
			}
		});
	} else {
		//TODO(Arpit): Support bulk update of resources
	}
};

functions.delete = function(payload, query, callback) {
	var paths = parsePath(query.path)

	var doc_type = paths[0]
	var doc_id = -1

	if (paths.length == 2) {
		doc_id = paths[1]
	} else {
		console.log("Bulk update of resources")
	}

	if (doc_id != -1) {
		console.log("Deleting the doc ",doc_id)
		fs.readFile(storePath, (err, data) => {
			var res_json = {};
			if (err) {
				res_json["error"] = "Unable to read file";
				res_json["msg"] = "Failed";
				callback(500, JSON.stringify(res_json));
			} else {
				const store = JSON.parse(data)
				var docsResource = store[doc_type]

				var docs = docsResource.docs;
				delete docs[doc_id];
				docsResource.index[doc_id] = 0;

				fs.writeFile(storePath, JSON.stringify(store, null, 4), err=> {
					if (err) {
						res_json["error"] = "File write error";
						res_json["msg"] = "Failed";
						callback(500, JSON.stringify(res_json));
						return
					}
					res_json["error"] = null;
					res_json["msg"] = "Success";
					callback(200, JSON.stringify(res_json));
				});
			}
		});
	} else {
		//TODO(Arpit): Add support for bulk delete
	}
};

functions.patch = function(payload, query, callback) {
	var paths = parsePath(query.path)

	var doc_type = paths[0]
	var doc_id = -1

	if (paths.length == 2) {
		doc_id = paths[1]
	} else {
		console.log("Bulk update of resources")
	}

	if (doc_id != -1) {
		fs.readFile(storePath, (err,data) => {
			console.log("PUT: reading file store.json");
			if (err) {
				console.log("unable to read file");
				const res_json = {"error": "Unable to read store file", "msg":"Failed"};
				callback(500, JSON.stringify(res_json));
			} else {
				const store = JSON.parse(data);
				const docsResource = store[doc_type];
				var docs = docsResource.docs

				var docExists = false;
				if (docsResource.index[doc_id]) {
					if (docsResource.index[doc_id] == 1) {
						docExists = true;
					}
				}

				if (!docExists) {
					console.log("Doc does not exits, use a POST request to first create the resource");
					const res_json = {"error": "Resource not found", "msg":"Use POST for creating a resource"};
					callback(500, JSON.stringify(res_json));
					return
				}

				//TODO(Arpit) : Validate that the payload is a valid payload for a particular doc type
				if (!(validate_payload(payload, doc_type))) {
					console.log("Invalid payload");
					const res_json = {"error": "Invalid payload"};
					callback(500, JSON.stringify(res_json));
					return
				}

				if (payload.id) {
					if (payload.id != doc_id) {
						console.log("The id cannot be mutated");
						const res_json = {"error": "Id mutation is prohibited"};
						callback(500, JSON.stringify(res_json));
						return
					}
				}
				payload.id = doc_id;

				for (key in payload) {
					docs[doc_id][key] = payload[key];
				}

				fs.writeFile(storePath, JSON.stringify(store, null, 4), err=> {
					var res_json = {};
					if (err) {
						res_json["error"] = "I/O error"
						res_json["msg"] = "Failed due to i/o error"
						callback(500, JSON.stringify(res_json));
						return
					}
					res_json["error"] = null
					res_json["msg"] = "Success"
					callback(200, JSON.stringify(res_json));
				});
			}
		});
	} else {
		//TODO(Arpit): Support bulk update of resources
	}
}

functions.post = function(payload, query, callback) {
	//TODO(Arpit) Validate the structure of the payloads. Authors payload must contains keys with "firstName" "lastName".. etc
	// Also validate the query path, should be posts or authors
	doc_type = get_doc_type(query.path);

	fs.readFile(storePath, (err, data) => {
		console.log("reading file store.json")
		if (err) {
			console.log("unable to read file")
			const res_json = {"id": null, "msg":"Failed", "error":"Unable to read store file"}
			callback(500, JSON.stringify(res_json));
		} else {
			const store = JSON.parse(data);
			const docsResource = store[doc_type]
			const docs = docsResource.docs;
			if (!docsResource.last_id) {
				docsResource["last_id"] = 0;
			}
			const last_id = docsResource.last_id;

			payload.id = last_id + 1;
			docsResource.last_id = payload.id;

			payload.views = 0
			docs[payload.id] = payload

			//Update the indexes
			docsResource.index[payload.id] = 1
			fs.writeFile(storePath, JSON.stringify(store, null, 4), err=> {
				if (err) {
					callback(500, "Unable to write to file")
					return
				}
				const res_json = {"id": payload.id, "msg":"Success", "error":null};
				callback(200, JSON.stringify(res_json))
			});
		}
	});
};

module.exports = functions
