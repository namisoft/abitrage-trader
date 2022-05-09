/**
 * Author: @cryptoz
 * Date: 10/25/21
 * Time: 11:26 AM
 */

export type BaseResult<D = any, E = any> = {
    data?: D;
    error?: E;
}