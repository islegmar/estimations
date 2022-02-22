import * as TS  from '/modules/app/timeseries.js';
import * as L from '/modules/lib/log.js';

var node1={
  'data' : {
    'start_date' : '12/01/2022',
    'end_date' : '14/01/2022',
    'md' : {
      'BE' : 50,
      'FE' : 10
    }
  }
}

var node2={
  'data' : {
    'start_date' : '13/01/2022',
    'end_date' : '20/01/2022',
    'md' : {
      'PO' : 5,
      'FE' : 10
    }
  }
}
var ts1 = TS.getNodeTS(node1);
var ts2 = TS.getNodeTS(node2);

var all_ts={};
TS.extendsTSAttributes(all_ts, ts1);
TS.extendsTSAttributes(all_ts, ts2);

L.log_info(ts1);
L.log_info(ts2);
L.log_info(all_ts);
  
TS.groupTSAttributeValues(all_ts);
L.log_info(all_ts);

var gr_ts=TS.groupTSKey(all_ts, dt => {
  return (dt.getMonth() + 1).toString().padStart(2, "0") + "-" + dt.getFullYear().toString().substring(2);
});
L.log_info(gr_ts);

TS.averageTS(gr_ts);
L.log_info(gr_ts);
