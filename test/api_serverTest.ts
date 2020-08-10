import {notStrictEqual, strictEqual} from 'assert';
import supertest from 'supertest';

import { getToken } from './util/util';


const request = supertest('http://localhost:1337');

let currentPlaylistID: number;
let currentPLCID: number;


