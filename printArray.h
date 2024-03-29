#pragma once
#ifndef __PRINTARRAY20240329_H__
#define __PRINTARRAY20240329_H__

#include <iostream>
using namespace std;

void printArray(int t[], int n, const char sep[]=", ")
{
    for (int i = 0; i < n; i++)
    {
        cout << t[i] << sep;
    }
    cout << endl;
}


#endif // __PRINTARRAY20240329_H__