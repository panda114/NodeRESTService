
var fs = require('fs')

var functions = {}

functions.get = function(pid, query_params, callback) {
	fs.readFile('store.json', (err, data) => {
		const search_string = query_params.q

		console.log("GET reading file store.json")
		if (err) {
			console.log("unable to read file")
			callback(500, "Unable to read file")
			return
		} else {
			const store = JSON.parse(data)

			posts = store.posts
			console.log("store ",store)
			console.log("posts ",posts)

			var found = false

			if (!pid && !search_string) {
				console.log('return all posts');

				var sort = ('_sort' in query_params);

				console.log('sort ',sort)
				console.log('query_params ',query_params)

				if (sort) {
					var order = 'asc'
					if ('_order' in query_params) {
						order = query_params._order;
					}

					const sortField = query_params._sort;

					console.log("Sort order ",order)

					if (sortField == 'view' || sortField == 'author' || sortField == 'title' || sortField == 'pid') {
						posts.sort(function(a,b) {
							if (a[sortField] < b[sortField]) {
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
						console.log("posts ",posts)
					} else {
						console.log("invalid sort field")
						callback(500, "invalid sort field")
						return 
					}
				} 
				callback(200, JSON.stringify(posts))
				return
			}

			for (post of posts) {
				console.log("post ",post)
				if (pid) {
					if (post.pid == pid) {
						console.log("Found post for pid",pid)
						post.view = post.view + 1
						callback(200, JSON.stringify(post))
						found = true
						break
					}
				} else {
					if (search_string) {
						if (post.title.includes(search_string)) {
							console.log("Search succeeded query ",search_string)
							post.view = post.view + 1
							callback(200, JSON.stringify(post))
							found = true
							break
						}
						if (post.author.includes(search_string)) {
							console.log("Search succeeded query ",search_string)
							post.view = post.view + 1
							callback(200, JSON.stringify(post))
							found = true
							break
						}
					}
				}
			}
			if (found) {
				console.log("Incrementing the view count")
				fs.writeFile("store.json", JSON.stringify(store,null, 4), (err) => {
					if (err) {
						console.log("Unable to increment the view count");
					} else {

					}
				});
				return
			}
			console.log("pid not found in store")
			callback(500, "Unable to find post")
		}
	});
};

functions.put = function(pid, payload, callback) {
	const data = fs.readFileSync('./posts_index.json', {encoding:'utf8', flag:'r'});
	const map = JSON.parse(data)

	if (!(pid in map)) {
		callback(500, "pid does not exist, use POST to add an entry to the store")
		return
	}

	fs.readFile('store.json', (err, data) => {
		console.log("reading file store.json")
		if (err) {
			console.log("unable to read file")
			callback(500, 'Unable to read file')
		} else {
			const store = JSON.parse(data)
			const posts = store.posts

			store.posts.append(payload)
			fs.writeFile("store.json", JSON.stringify(store, null, 4), err=> {
				if (err) {
					callback(500, "Unable to write to file");
					return
				}
				callback(200, "Success");
			});
		}
	});
};

functions.delete = function(pid, payload, callback) {
	fs.readFile('store.json', (err, data) => {
		if (err) {
			callback(500, "Unable to read file")
		} else {
			const store = JSON.parse(data)
			var posts = store.posts

			const index_data = fs.readFileSync('./posts_index.json', {encoding:'utf8', flag:'r'});
			const map = JSON.parse(data)

			for (var i = 0; i < posts.length; i++) {
				if ( posts[i].pid == pid) {
					map[pid] = 0
					posts.splice(i, 1);
					i--;
				}
			}

			fs.writeFile("posts_index.json", JSON.stringify(map, null, 4), err => {
				if (err) {
					console.log("Error the update the index map post deletion")
				} else {
					console.log("The index map is updated post deletion")
				}
			})

			fs.writeFile("store.json", JSON.stringify(store, null, 4), err=> {
				if (err) {
					callback(500, "Unable to write to file")
					return
				}
				callback(200, "Success")
			})
		}
	});
};

functions.patch = function(pid, payload, callback) {
	const data = fs.readFileSync('./posts_index.json', {encoding:'utf8', flag:'r'});
	const map = JSON.parse(data)

	if (!(pid in map)) {
		callback(500, "pid does not exist, use POST to add an entry to the store")
		return
	}

	fs.readFile('store.json', (err, data) => {
		console.log("reading file store.json")
		if (err) {
			console.log("unable to read file")
			callback(500, 'Unable to read file')
		} else {
			const store = JSON.parse(data)
			const posts = store.posts 

			for (var post of posts) { 
				if (post['pid'] == pid) {
					for (var key in payload) {
						post[key] = payload[key]
					}
				}
			}

			fs.writeFile("store.json", JSON.stringify(store, null, 4), err=> {
				if (err) {
					callback(500, "Unable to write to file")
					return
				}
				callback(200, "Success")
			})
		}
	});
};

functions.post = function(pid, payload, callback) {
	const data = fs.readFileSync('posts_index.json', {encoding:'utf8', flag:'r'});
	const map = JSON.parse(data)

	if (pid in map) {
		if (map[pid] == 1) {
			callback(500, "pid already exits, use PUT to modify the pid")
			return
		}
	}

	fs.readFile('store.json', (err, data) => {
		console.log("reading file store.json")
		if (err) {
			console.log("unable to read file")
			callback(500, 'Unable to read file')
		} else {
			const store = JSON.parse(data)
			payload.view = 0
			store.posts.push(payload)

			fs.writeFile("store.json", JSON.stringify(store, null, 4), err=> {
				if (err) {
					callback(500, "Unable to write to file")
					return
				}
				callback(200, "Success")
			})

			// Update the index map
			map[pid] = 1
			fs.writeFile("posts_index.json", JSON.stringify(map, null, 4), err=> {
				if (err) {
					console.log("Error in updating the index file")
				} else {
					console.log("Index file successfully updated")
				}
			})
		}
	});
};

module.exports = functions
