"use strict";

function Parser(config) {
    this.MAX_IDENT = config.MAX_IDENT || 16;
    this.MAX_ITEMS = config.MAX_ITEMS || 256;
    this.MAX_NODE_ID = config.MAX_NODE_ID || 128;
}

function Tree(config) {
    this.nodeList = [];
    this.rootNodeId = undefined;
}

function Node(id, name) {
    this.id = id;
    this.name = name;
}



