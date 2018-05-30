# Kara.moe redirector

This is a simple index.php you put at the root of your short domain to be used with Karaoke Mugen.

If your short domain is something like "a.com" you'll want to set up your KM instance to use it.

```
OnlineMode = 1
OnlineHost = a.com
OnlinePort = 80
```

After that start Karaoke Mugen and your users will be prompted to go to http://a.com

This script will then redirect them to your local IP.
