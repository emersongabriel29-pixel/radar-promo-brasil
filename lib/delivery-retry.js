// A failed explicit provider response is retryable; uncertain acceptance is handled
// separately as WAITING_CONFIRMATION and must never be resent automatically.
export function deliveryBackoffSeconds(attempts=0,retryAfterSeconds=0){
 const count=Math.max(0,Math.floor(Number(attempts)||0));
 const bounded=300*Math.pow(2,Math.min(6,count));
 const provider=Number(retryAfterSeconds);
 return Math.max(Math.min(21600,bounded),Number.isSafeInteger(provider)&&provider>=0&&provider<=2147483647?provider:0);
}
