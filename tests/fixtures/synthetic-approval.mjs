// Invented observations for the parked renderer: never load withdrawn provider data.
const administrations=[
 {start:'2018-03-14',end:'2021-12-07',leader:'Test A',color:'#64748b'},
 {start:'2021-12-08',end:'2025-05-05',leader:'Test B',color:'#e3000f'},
 {start:'2025-05-06',end:null,leader:'Test C',color:'#181818'},
];
const readings=administrations.flatMap((term,i)=>[0,30,60,90].map((days,j)=>({
 date:new Date(Date.parse(term.start)+days*86400000).toISOString().slice(0,10),
 leader:term.leader,positive:30+i*4+j,negative:55-i*2-j,
})));
export const syntheticApproval={countries:{de:{administrations,source:{label:'Synthetic test fixture',href:'https://example.test'},questions:{leader:'Test leader?',government:'Test government?'},series:{leader:readings,government:readings}}}};
