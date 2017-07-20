import escapeStringRegexp from "escape-string-regexp"
import extend from "just-extend"

function matchAll(str, re) {
	const matches = []
	let res = re.exec(str)

	while (res) {
		matches.push(res)

		if (!re.global) {
			break
		}

		res = re.exec(str)
	}
	return matches
}

function replaceAll(str, matches) {
	return matches.reverse().reduce(function(res, match) {
		const prefix = res.slice(0, match.index)
		const postfix = res.slice(match.index + match[0].length)

		return prefix + match.replacement + postfix
	}, str)
}

function assignReplacement(match, replacer) {
	const args = match.concat([match.index, match.input])

	return replacer.apply(null, args).then(function(res) {
		return extend({}, match, { replacement: res })
	})
}

function sequence(matches, replacer) {
	const initialResult = Promise.resolve([])

	return matches.reduce(function(prev, match) {
		return prev.then(function(ret) {
			return assignReplacement(match, replacer).then(function(res) {
				return ret.concat([res])
			})
		})
	}, initialResult)
}

function concurrency(matches, replacer) {
	const promises = matches.map(function(match) {
		return assignReplacement(match, replacer)
	})

	return Promise.all(promises)
}

function processString(str, re, replacer) {
	if (typeof replacer === "string") {
		return str.replace(re, replacer)
	}

	if (typeof re === "string") {
		re = new RegExp(escapeStringRegexp(re))
	}

	const matches = matchAll(str, re)
	const processor = concurrency

	return processor(matches, replacer).then(function(matches) {
		return replaceAll(str, matches)
	})
}

function fn(str, re, replacer) {
	re.lastIndex = 0
	try {
		return Promise.resolve(processString(str, re, replacer))
	} catch (e) {
		return Promise.reject(e)
	}
}

function stringReplaceAsync(str, re, replacer) {
	return fn(str, re, replacer, false)
}

export default stringReplaceAsync