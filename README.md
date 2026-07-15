# PSD Survey

পীরগাছা এলাকার বাজার, পণ্য সংগ্রহ ও হোম ডেলিভারি সার্ভিস বিষয়ক জরিপের public survey page.

## Public survey link

```text
https://hanifbhuian.github.io/PSD-Survey/
```

## Survey Web App URL

```text
https://script.google.com/macros/s/AKfycbw_WS2SyYCU2_9pzNBlcWhTDI4dgVZawRk0sNNNFq2WnxCWHjzpMUR04AkeOxuoNd1n/exec
```

## Notes

- `index.html` contains the public survey form.
- Google Apps Script handles Google Sheet submission and duplicate prevention.
- Visible question serials should use Bangla numerals only.
- Location first tries the current position, then a cached position from the last 10 minutes when available.
- `device-guard.js` adds household instructions and persistent same-device detection.

Updated to run the household and device restriction workflow.
