/**
 * Created by IntelliJ IDEA.
 * Author: @cryptoz
 * Date: 7/9/2019
 * Time: 10:50 AM
 */
export namespace HttpResData {
    class Body {
        constructor(public status: string, public data?: any, public message?: string) {
        }
    }

    export const success = (data?: any, message?: string) => new Body('Ok', data, message);
    export const fail = (status: string, message?: string) => new Body(status, undefined, message);
}
