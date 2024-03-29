#include <iostream>
#include <time.h>
#include "printArray.h"
#include "randomArray.h"

using namespace std;

int main()
{
    int r = 100;
    int *p = new int[r];


    randomArray(p,r,0,500,true);
    printArray(p,r," ");
    

    delete [] p;
}