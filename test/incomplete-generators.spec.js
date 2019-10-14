import test from 'ava';
import express from 'express';
import request from 'supertest';
import multer from 'multer';

import {files, cleanStorage} from './utils/testutils';
import {generateUrl} from './utils/settings';
import GridFsStorage from '..';

test.before(async t => {
	const url = generateUrl();
	const app = express();
	const storage = new GridFsStorage({
		url,
		*file() {
			yield {filename: 'name'};
		}
	});
	t.context.storage = storage;
	const upload = multer({storage});

	/* eslint-disable-next-line no-unused-vars */
	app.post('/url', upload.array('photos', 2), (err, req, res, next) => {
		t.context.error = err;
		res.end();
	});

	await storage.ready();
	await request(app)
		.post('/url')
		.attach('photos', files[0])
		.attach('photos', files[1]);
});

test.after.always('cleanup', t => {
	cleanStorage(t.context.storage);
});

test('is a failed request', t => {
	const {error} = t.context;
	t.true(error instanceof Error);
	t.is(error.storageErrors.length, 0);
});

test('does not upload any file', async t => {
	const {storage} = t.context;
	const {db} = storage;
	const count = await db.collection('fs.files').estimatedDocumentCount();
	t.is(count, 0);
});

test('throws an error about the ended generator', t => {
	const {error} = t.context;
	t.regex(error.message, /Generator ended unexpectedly/);
});