/**
 * Created by IntelliJ IDEA.
 * Author: @cryptoz
 * Date: 10/24/2021
 * Time: 10:00 AM
 */
import {injectable, singleton} from "tsyringe";

import express = require("express");

@singleton()
@injectable()
export class ArbitrageController {
    constructor() {
    }

    test = (req: express.Request, res: express.Response) => {
        console.log(`Request received: ${req.url}`);
        res.json({status: "OK"});
    };
}

namespace ReqBodyData {
    export interface SendEther {
        fromAddress: string;
        toAddress: string;
        amount: number;
    }
}
