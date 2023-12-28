// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { NamedExoticComponent, memo, useCallback, useEffect, useMemo } from "react";
import styles from './app.module.css';

import NxWelcome from './nx-welcome';
import { FetchNextPageOptions, InfiniteQueryObserver, InfiniteQueryObserverResult, QueryClient, QueryClientProvider, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { last } from "lodash";

import {sub} from 'date-fns';
type CData = {
  value: number;
  // timestamp: Date;
}
type QuoteFeedCB = (data: CData[]) => void

interface QuoteFeed {
  fetchInitialData: (dataType: string, startDate: Date, endDate: Date, cb: QuoteFeedCB) => void;
  fetchUpdateData: (dataType: string, startDate: Date, cb:QuoteFeedCB) => void;
  // fetchPaginationData: (dataType: string, startDate: Date, endDate: Date, cb: QuoteFeedCB) => void;
}

type FetchNextPageFn =(params?: FetchNextPageOptions) => Promise<InfiniteQueryObserverResult<CData[], unknown>>;

interface UseFetchInitialDataParams {
  fetchData: FetchNextPageFn;
}

type FetchInitialData = (
  dataType: string,
  startDate: Date,
  endDate: Date,
  cb: QuoteFeedCB
) => void;


type FetchUpdateData = (
  dataType: string,
  startDate: Date,
  cb: QuoteFeedCB
) => void

const useFetchInitialData = ({fetchData}: UseFetchInitialDataParams): FetchInitialData => {

  return useCallback(async (dataType, startDate, endDate, cb) => {
    console.log('fetch initial data');

    await fetchData({
      pageParam: { dataType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    cancelRefetch: true
    }).then(r => last(r.data?.pages))
    .then(res =>{
      if(res) {
        cb(res);
      }
    })
  }, [])
}


const useFetchUpdateData = ({fetchData}: UseFetchInitialDataParams): FetchUpdateData => {

  return useCallback(async (dataType, startDate, cb) => {
    console.log('fetch update data');

    await fetchData({
      pageParam: { dataType,
      startDate: startDate.toISOString(),
    },
    cancelRefetch: true
    }).then(r => last(r.data?.pages))
    .then(res =>{
      if(res) {
        cb(res);
      }
    })
  }, [])
}

const makeData = (params: any): CData[] => {
  const out: CData[] = []
  for (let i = 0; i < 30; i++) {
    out.push({value: Math.random()});
  }
  return out;
};

const useInfiniteCData = (id: string) => {
  const queryClient = useQueryClient();

  return useMemo(() => new InfiniteQueryObserver<CData[]>(queryClient, {
    queryKey: ['quotefeed', id],
    queryFn: ({pageParam}) => {
      const data = makeData(pageParam) as CData[];
      console.log('here', data);
      return data;
    },
    staleTime: Infinity,
    refetchInterval: Infinity,
    initialData: {
      pages: [[]],
      pageParams: []
    }
  }), [id, queryClient]);
}

const useInfiniteCDataQuery = (id: string) => {
  const queryClient = useQueryClient();
  return useInfiniteQuery({
    queryKey: ['quotefeed', id],
    queryFn: ({pageParam}) => {
      const data = makeData(pageParam) as CData[];
      console.log('here', data);
      return data;
    },
    staleTime: Infinity,
    refetchInterval: Infinity,
    initialData: {
      pages: [[]],
      pageParams: []
    }
  })
}

const useQuoteFeed = (id?: string) => {

  // In real application the system has to pick one of 3 data observers based on the ID. Omitted for this example.
  const dataObserver = useInfiniteCData('key');

  const {fetchNextPage }= useInfiniteCDataQuery('key');

  const fetchInitialData = useFetchInitialData({fetchData: fetchNextPage});
  const fetchUpdateData = useFetchUpdateData({fetchData: fetchNextPage})

  const quoteFeed = useMemo<QuoteFeed>(() => {
    return {
      fetchInitialData,
      fetchUpdateData
    }
  }, [fetchInitialData]);

  return {quoteFeed};
}


class ThirdPartyObject {
  quoteFeed?: QuoteFeed;
  dataType: string;
  data: CData[] = [];

  timeout?: NodeJS.Timeout;
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-empty-function
  constructor(dataType: string) {
    this.dataType = dataType;
  }


  cb(data: CData[]) {
    console.log(data);
    this.data = [...this.data, ...data];
    console.log('data object set');
    const el = document.getElementById('canvas-el');
    if(el)
    el.innerHTML = JSON.stringify(this.data);
  }

  attachQuoteFeed (feed: QuoteFeed) {
    this.quoteFeed = feed;

    const now = new Date();
    feed.fetchInitialData(this.dataType, sub(now, {days: 30}), now, this.cb.bind(this) );

    this.createUpdateLoop();
  }

  createUpdateLoop() {
      this.timeout = setInterval(() => {
        const now = new Date();

        this.quoteFeed?.fetchUpdateData(this.dataType, now, this.cb.bind(this) );
      }, 15_000)
  }

  destroy() {
    clearInterval(this.timeout);
  }

}

const ThirdPartyLibraryComponent: NamedExoticComponent<{quotefeed: QuoteFeed }> = memo(({quotefeed}) => {

  const thirdPartyObject = useMemo(() => {
    return new ThirdPartyObject('base type');
  }, [])

  useEffect(() => {
    thirdPartyObject.attachQuoteFeed(quotefeed);

    return () => thirdPartyObject.destroy();
  }, [quotefeed, thirdPartyObject]);

  return<div id="canvas-el"/>;
})

const MainComponent = memo(() => {
  const {quoteFeed} = useQuoteFeed();

  return (
    <div>
      <ThirdPartyLibraryComponent quotefeed={quoteFeed}/>
    </div>
  );
})

const mainClient = new QueryClient();

export function App() {


  return <QueryClientProvider client={mainClient}>
    <MainComponent/>
  </QueryClientProvider>


}

export default App;
