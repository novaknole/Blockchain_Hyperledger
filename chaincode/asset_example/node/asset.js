
const shim = require('fabric-shim');
const util = require('util');

var Asset = class {

    async Init(stub) {
        let ret = stub.getFunctionAndParameters();
        let params = ret.params;
        if (params.length != 2) {
            return shim.error("Incorrect number of arguments. Expecting 2");
        }
        let A = params[0];
        let B = params[1];

        try {
            await stub.putState(A, Buffer.from(B));
            return shim.success(Buffer.from("success"));
        } catch (e) {
            return shim.error(e);
        }
    }


    async Invoke(stub) {
        let ret = stub.getFunctionAndParameters();
        let params = ret.params;
        let fn = ret.fcn;
        if (fn === 'set') {
            var result = await this.setValues(stub, params);
            if(result)
                return shim.success(Buffer.from("success"));
        } else {
            var result = await this.getValues(stub, params);
            if(result)
                return shim.success(Buffer.from(result.toString()));
        }
        if (!result) {
            return shim.error('Failed to get asset');
        }

    }

    async setValues(stub, args) {
        if (args.length != 2) {
            return shim.error("Incorrect number of arguments. Expecting 2");
        }
        try {
            return await stub.putState(args[0], Buffer.from(args[1]));
        } catch (e) {
            return shim.error(e);
        }
    }

    async getValues(stub, args) {
        if (args.length != 1) {
            return shim.error("Incorrect number of arguments. Expecting 1");
        }
        try {
            return await stub.getState(args[0]);
        } catch (e) {
            return shim.error(e);
        }
    }

}

shim.start(new Asset());