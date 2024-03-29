#pragma once
#ifndef __RANDOMARRAY20240329_H__
#define __RANDOMARRAY20240329_H__

#include <iostream>
using namespace std;


int randomArray(int t[], int n, int min, int max, int unique=false)
{
    srand(time(NULL));
    if(min > max) swap(min, max);
    
    if (unique)
    {
        int spread = max - min + 1;
        if(spread <= n) return -1;
        t[0] = max - n;
        int m;
        for(int i = 0; i < n; i++)
        {
            m = min + rand() % spread;
            if(m < t[0]) t[0] = m;
        }

        for(int i = 1; i < n; i++)
        {
            spread = (max - t[i-1] - n + i)/(n-i); //hmm...
            if(spread > 1)
            {
                t[i] = t[i-1] + rand() % spread + 1;
            }
            else
            {
                t[i] = t[i-1] + 1;
            }            
        }

        for(int i = 0; i < n; i++)
        {
            int j = rand() % n;
            swap(t[i], t[j]);
        }

    }
    else
    {
        int spread = max - min + 1;
        for (int i = 0; i < n; i++)
        {
            t[i] = rand() % spread + min;
        }
    }
    return 0;
}


#endif // __RANDOMARRAY20240329_H__